import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Session } from '@/types/database';

export interface OrganiserAuthResult {
  authorised: boolean;
  error?: string;
  statusCode?: number;
  user?: { id: string; email?: string };
  session?: Session;
}

/**
 * Verifies that the current request is from an authenticated organiser
 * and that the organiser owns the requested session.
 */
export async function verifyOrganiserSession(sessionId: string): Promise<OrganiserAuthResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorised: false,
      error: 'Unauthorised. Organiser login required.',
      statusCode: 401,
    };
  }

  const adminSupabase = createAdminClient();
  const { data: session, error: sessionError } = await adminSupabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return {
      authorised: false,
      error: 'Session not found.',
      statusCode: 404,
    };
  }

  if (session.organiser_id !== user.id) {
    return {
      authorised: false,
      error: 'Forbidden. You do not have permission to manage this session.',
      statusCode: 403,
    };
  }

  return {
    authorised: true,
    user: { id: user.id, email: user.email },
    session: session as Session,
  };
}
