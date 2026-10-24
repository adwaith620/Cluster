import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from './client';

export function createAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = normalizeSupabaseUrl(rawUrl);
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  const isConfigured = Boolean(
    supabaseUrl &&
    serviceRoleKey &&
    !supabaseUrl.includes('placeholder') &&
    !serviceRoleKey.includes('placeholder')
  );

  if (!isConfigured) {
    return createClient(
      'https://build-stub.supabase.internal',
      'build-stub-service-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
