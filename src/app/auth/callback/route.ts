import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Sanitize redirect URL to prevent open redirect vulnerabilities
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  // Handle OAuth provider cancellation or denial
  if (oauthError) {
    const errorMsg =
      oauthError === 'access_denied'
        ? 'Google sign-in was canceled.'
        : errorDescription || oauthError;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, requestUrl.origin)
    );
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('OAuth code exchange error:', error.message);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent('Failed to authenticate with Google. Please try again.')}`,
          requestUrl.origin
        )
      );
    }

    return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  }

  // If accessed without a code or error, return to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
