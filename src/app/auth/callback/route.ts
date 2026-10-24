import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { normalizeSupabaseUrl } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Sanitize next parameter to prevent open redirects
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  // Handle x-forwarded-host from reverse proxies (Vercel)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const origin = forwardedHost ? `https://${forwardedHost}` : requestUrl.origin;

  // Handle OAuth provider cancellation or denial
  if (oauthError) {
    const errorMsg =
      oauthError === 'access_denied'
        ? 'Google sign-in was canceled.'
        : errorDescription || oauthError;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, origin)
    );
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = normalizeSupabaseUrl(rawUrl);
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent('Configuration Error: Supabase environment variables are missing on the deployment server.')}`,
        origin
      )
    );
  }

  if (code) {
    const redirectUrl = new URL(safeNext, origin);
    const response = NextResponse.redirect(redirectUrl);

    // Create SSR client directly bound to response.cookies to guarantee Set-Cookie headers on redirect
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('OAuth code exchange error:', error.message);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent('Failed to authenticate with Google: ' + error.message)}`,
          origin
        )
      );
    }

    // Return redirect response with auth session cookies attached
    return response;
  }

  // If accessed without a code or error, return to login
  return NextResponse.redirect(new URL('/login', origin));
}
