import { NextRequest, NextResponse } from 'next/server';
import { verifyOrganiserSession } from '@/lib/auth/organiser';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateTeamNameSchema } from '@/lib/validators';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id, teamId } = await params;
    const auth = await verifyOrganiserSession(id);
    if (!auth.authorised || !auth.session) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = updateTeamNameSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Verify team belongs to this session
    const { data: existingTeam, error: fetchErr } = await adminSupabase
      .from('teams')
      .select('id, session_id, team_number')
      .eq('id', teamId)
      .eq('session_id', id)
      .single();

    if (fetchErr || !existingTeam) {
      return NextResponse.json({ error: 'Team not found in this session' }, { status: 404 });
    }

    const { data: updatedTeam, error: updateErr } = await adminSupabase
      .from('teams')
      .update({ name: parseResult.data.name })
      .eq('id', teamId)
      .eq('session_id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('Update team name error:', updateErr);
      return NextResponse.json({ error: 'Failed to update team name' }, { status: 500 });
    }

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (err) {
    console.error('Update team error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
