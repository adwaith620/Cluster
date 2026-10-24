import { NextRequest, NextResponse } from 'next/server';
import { verifyOrganiserSession } from '@/lib/auth/organiser';
import { createAdminClient } from '@/lib/supabase/admin';
import { SessionStatus } from '@/types/database';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyOrganiserSession(id);
    if (!auth.authorised || !auth.session) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const currentStatus = auth.session.status;
    const adminSupabase = createAdminClient();

    let targetStatus: SessionStatus | null = null;
    let targetArchived: boolean | null = null;

    switch (action) {
      case 'open_registration':
        if (currentStatus !== 'draft' && currentStatus !== 'registration_locked') {
          return NextResponse.json(
            { error: `Cannot open registration from current status: ${currentStatus}` },
            { status: 400 }
          );
        }
        targetStatus = 'registration_open';
        break;

      case 'lock_registration':
        if (currentStatus !== 'registration_open') {
          return NextResponse.json(
            { error: `Cannot lock registration from current status: ${currentStatus}` },
            { status: 400 }
          );
        }
        targetStatus = 'registration_locked';
        break;

      case 'complete':
        if (currentStatus !== 'revealed') {
          return NextResponse.json(
            { error: `Cannot complete session before revealing teams` },
            { status: 400 }
          );
        }
        targetStatus = 'completed';
        break;

      case 'archive':
        targetArchived = true;
        break;

      case 'unarchive':
        targetArchived = false;
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (targetStatus) updates.status = targetStatus;
    if (targetArchived !== null) updates.is_archived = targetArchived;

    const { data: updated, error } = await adminSupabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (err) {
    console.error('Session status transition error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
