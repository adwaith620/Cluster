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

    if (auth.session.status !== 'assigned') {
      return NextResponse.json(
        { error: 'Session must be in "assigned" state before revealing teams.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase.rpc('reveal_session_teams', {
      p_session_id: id,
    });

    if (error) {
      const msg = error.message;
      if (msg.includes('MISSING_MEDIA')) {
        return NextResponse.json(
          { error: 'Cannot reveal: every team must have an uploaded media asset first.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Reveal teams error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
