import { NextRequest, NextResponse } from 'next/server';
import { verifyOrganiserSession } from '@/lib/auth/organiser';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateParticipantsCsv, ParticipantCsvRow } from '@/lib/utils/csv';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyOrganiserSession(id);
    if (!auth.authorised || !auth.session) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
    }

    const adminSupabase = createAdminClient();

    // Fetch all participants with their assigned teams
    const { data: participants, error } = await adminSupabase
      .from('participants')
      .select('name, status, created_at, team:teams(team_number, name)')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: ParticipantCsvRow[] = (participants || []).map((p: any) => ({
      participantName: p.name,
      status: p.status,
      teamNumber: p.team?.team_number || 'Unassigned',
      teamName: p.team?.name || 'Unassigned',
      joinedAt: new Date(p.created_at).toISOString(),
    }));

    const csvContent = generateParticipantsCsv(rows);
    const safeTitle = auth.session.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `cluster_${safeTitle}_participants.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('CSV export error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
