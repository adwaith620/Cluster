import { NextRequest, NextResponse } from 'next/server';
import { verifyOrganiserSession } from '@/lib/auth/organiser';
import { createAdminClient } from '@/lib/supabase/admin';

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
    const targetStatus = body.target_status || 'registration_locked';

    if (targetStatus !== 'registration_locked' && targetStatus !== 'registration_open') {
      return NextResponse.json(
        { error: 'Invalid target status for reset. Allowed: registration_locked or registration_open' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Unset all team assignments for this session's participants
    const { error: unassignError } = await adminSupabase
      .from('participants')
      .update({ team_id: null })
      .eq('session_id', id);

    if (unassignError) {
      return NextResponse.json({ error: unassignError.message }, { status: 500 });
    }

    // 2. Update session status
    const { data: updatedSession, error: updateSessionError } = await adminSupabase
      .from('sessions')
      .update({ status: targetStatus, team_count: null })
      .eq('id', id)
      .select()
      .single();

    if (updateSessionError) {
      return NextResponse.json({ error: updateSessionError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Session successfully reset to ${targetStatus}`,
      session: updatedSession,
    });
  } catch (err) {
    console.error('Session reset error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
