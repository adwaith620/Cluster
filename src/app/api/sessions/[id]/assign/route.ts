import { NextRequest, NextResponse } from 'next/server';
import { verifyOrganiserSession } from '@/lib/auth/organiser';
import { createAdminClient } from '@/lib/supabase/admin';
import { assignTeamsSchema } from '@/lib/validators';

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

    if (auth.session.status !== 'registration_locked' && auth.session.status !== 'assigned') {
      return NextResponse.json(
        { error: 'Registration must be locked before assigning teams.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = assignTeamsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid team count', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { team_count } = parseResult.data;
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase.rpc('assign_teams_randomly', {
      p_session_id: id,
      p_team_count: team_count,
    });

    if (error) {
      const msg = error.message;
      if (msg.includes('INSUFFICIENT_PARTICIPANTS')) {
        return NextResponse.json(
          { error: msg.replace(/.*INSUFFICIENT_PARTICIPANTS:\s*/, '') },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Assign teams error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
