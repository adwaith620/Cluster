import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PARTICIPANT_DEVICE_COOKIE } from '@/lib/utils/participant';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await params;
    const body = await req.json().catch(() => ({}));
    const cookieToken = req.cookies.get(PARTICIPANT_DEVICE_COOKIE)?.value;
    const deviceToken = body.device_token || cookieToken;

    if (!body.participant_id || !deviceToken) {
      return NextResponse.json(
        { error: 'participant_id and device_token are required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase.rpc('heartbeat_participant', {
      p_participant_id: body.participant_id,
      p_device_token: deviceToken,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Heartbeat error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
