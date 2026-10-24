import { NextRequest, NextResponse } from 'next/server';
import { verifyOrganiserSession } from '@/lib/auth/organiser';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { id, participantId } = await params;
    const auth = await verifyOrganiserSession(id);
    if (!auth.authorised || !auth.session) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify participant belongs to this session
    const { data: existingParticipant, error: fetchErr } = await adminSupabase
      .from('participants')
      .select('id, name, session_id, team_id, status')
      .eq('id', participantId)
      .eq('session_id', id)
      .single();

    if (fetchErr || !existingParticipant) {
      return NextResponse.json(
        { error: 'Participant not found in this session' },
        { status: 404 }
      );
    }

    // Delete the participant record
    const { error: deleteErr } = await adminSupabase
      .from('participants')
      .delete()
      .eq('id', participantId)
      .eq('session_id', id);

    if (deleteErr) {
      console.error('Participant delete error:', deleteErr);
      return NextResponse.json(
        { error: 'Failed to remove participant' },
        { status: 500 }
      );
    }

    // Query fresh active participant count
    const { count: activeCount } = await adminSupabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', id)
      .eq('status', 'active');

    return NextResponse.json({
      success: true,
      message: `Participant ${existingParticipant.name} has been removed`,
      participant_id: participantId,
      removed_participant_name: existingParticipant.name,
      active_count: activeCount ?? 0,
    });
  } catch (err) {
    console.error('Remove participant error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
