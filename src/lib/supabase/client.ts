import { createBrowserClient } from '@supabase/ssr';

/**
 * Sanitizes and normalizes the Supabase URL, including handling the common typo
 * between lowercase 'l' and 'i' (atljpayqntezmnqbprzn vs atijpayqntezmnqbprzn).
 */
export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // Auto-correct common visual confusion: lowercase 'l' instead of 'i' in the project ref
  if (url.includes('atljpayqntezmnqbprzn.supabase.co')) {
    url = url.replace('atljpayqntezmnqbprzn.supabase.co', 'atijpayqntezmnqbprzn.supabase.co');
  }
  return url;
}

export interface SupabaseConfigState {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseConfigState {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = normalizeSupabaseUrl(rawUrl);
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder') &&
    (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://'))
  );

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured,
  };
}

export function createClient() {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    if (typeof window !== 'undefined') {
      console.error(
        '[Cluster Supabase Error] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or unconfigured. ' +
        'Please verify environment variables in your Vercel Project Settings.'
      );
      throw new Error(
        'Supabase client is not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }
    // Safe mock client during Next.js build-time prerendering only (never called at browser runtime)
    return createBrowserClient('https://build-stub.supabase.internal', 'build-stub-anon-key');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
