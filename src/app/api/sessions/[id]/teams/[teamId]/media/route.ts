import { NextRequest, NextResponse } from 'next/server';
import { verifyOrganiserSession } from '@/lib/auth/organiser';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateMediaFile, updateTeamNameSchema } from '@/lib/validators';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id, teamId } = await params;
    const auth = await verifyOrganiserSession(id);
    if (!auth.authorised || !auth.session) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
    }

    if (auth.session.status === 'revealed' || auth.session.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot replace media after teams have been revealed.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No media file provided.' }, { status: 400 });
    }

    const validation = validateMediaFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Sanitize filename and create storage path
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${id}/team_${teamId}_${Date.now()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminSupabase.storage
      .from('team-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Retrieve public URL
    const { data: publicUrlData } = adminSupabase.storage
      .from('team-media')
      .getPublicUrl(storagePath);

    const mediaUrl = publicUrlData.publicUrl;

    // Update team row
    const { data: updatedTeam, error: teamUpdateError } = await adminSupabase
      .from('teams')
      .update({
        media_url: mediaUrl,
        media_type: validation.mediaType,
        media_mime_type: file.type,
        media_filename: cleanFileName,
      })
      .eq('id', teamId)
      .eq('session_id', id)
      .select()
      .single();

    if (teamUpdateError) {
      return NextResponse.json({ error: teamUpdateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      team: updatedTeam,
      media_url: mediaUrl,
    });
  } catch (err) {
    console.error('Team media upload route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const parse = updateTeamNameSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Invalid team name' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data: updatedTeam, error } = await adminSupabase
      .from('teams')
      .update({ name: parse.data.name })
      .eq('id', teamId)
      .eq('session_id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (err) {
    console.error('Team name update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
