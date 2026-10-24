import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerParticipantSchema } from '@/lib/validators';
import { generateDeviceToken, PARTICIPANT_DEVICE_COOKIE } from '@/lib/utils/participant';
import { checkRateLimit } from '@/lib/utils/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // Rate limiting: max 30 registration attempts per minute per IP
    const rateLimit = checkRateLimit(`register:${clientIp}:${code}`, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Look for existing device token from cookie or payload or generate fresh
    const cookieToken = req.cookies.get(PARTICIPANT_DEVICE_COOKIE)?.value;
    const deviceToken = body.device_token || cookieToken || generateDeviceToken();

    const parseResult = registerParticipantSchema.safeParse({
      join_code: code,
      name: body.name,
      device_token: deviceToken,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, join_code } = parseResult.data;
    const adminSupabase = createAdminClient();

    // Call atomic concurrency-safe RPC
    const { data, error } = await adminSupabase.rpc('register_participant', {
      p_join_code: join_code,
      p_name: name,
      p_device_token: deviceToken,
    });

    if (error) {
      const msg = error.message;
      if (msg.includes('SESSION_NOT_FOUND')) {
        return NextResponse.json({ error: 'Session not found. Please check your code.' }, { status: 404 });
      }
      if (msg.includes('SESSION_ARCHIVED')) {
        return NextResponse.json({ error: 'This session has been archived.' }, { status: 410 });
      }
      if (msg.includes('REGISTRATION_CLOSED')) {
        return NextResponse.json({ error: 'Registration for this session is currently closed.' }, { status: 403 });
      }
      if (msg.includes('CAPACITY_REACHED')) {
        return NextResponse.json(
          { error: 'This session is full. Maximum participant capacity has been reached.' },
          { status: 409 }
        );
      }
      if (msg.includes('INVALID_NAME')) {
        return NextResponse.json({ error: 'Please enter a valid name (1-60 characters).' }, { status: 400 });
      }

      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
    }

    const response = NextResponse.json({
      ...data,
      device_token: deviceToken,
    });

    // Set secure participant cookie (valid for 30 days)
    response.cookies.set({
      name: PARTICIPANT_DEVICE_COOKIE,
      value: deviceToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
