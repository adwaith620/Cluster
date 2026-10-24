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

    if (auth.session.status !== 'registration_open') {
      return NextResponse.json(
        { message: 'Session is not open for registration; inactivity cleanup is skipped.', cleaned: 0 },
        { status: 200 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const graceSeconds = Math.max(30, Math.min(600, Number(body.grace_seconds) || 180));

    const adminSupabase = createAdminClient();
    const { data: cleanedCount, error } = await adminSupabase.rpc('clean_inactive_participants', {
      p_session_id: id,
      p_grace_seconds: graceSeconds,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cleaned_count: cleanedCount || 0,
      grace_seconds: graceSeconds,
    });
  } catch (err) {
    console.error('Inactivity cleanup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
