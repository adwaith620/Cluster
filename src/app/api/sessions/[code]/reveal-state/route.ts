import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PARTICIPANT_DEVICE_COOKIE } from '@/lib/utils/participant';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const url = new URL(req.url);
    const participantId = url.searchParams.get('participant_id');
    const cookieToken = req.cookies.get(PARTICIPANT_DEVICE_COOKIE)?.value;
    const deviceToken = url.searchParams.get('device_token') || cookieToken;

    if (!participantId || !deviceToken) {
      return NextResponse.json(
        { error: 'participant_id and device_token are required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Look up session by join_code
    const { data: session, error: sessionErr } = await adminSupabase
      .from('sessions')
      .select('id, status, is_archived')
      .eq('join_code', code.toUpperCase())
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await adminSupabase.rpc('get_participant_reveal_data', {
      p_session_id: session.id,
      p_participant_id: participantId,
      p_device_token: deviceToken,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Reveal state fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
