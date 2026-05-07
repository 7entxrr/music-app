import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getCurrentUser } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Spotify OAuth error:', error);
      const redirectUrl = new URL('/', request.nextUrl.origin);
      redirectUrl.searchParams.set('spotify_error', error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      console.error('No authorization code provided');
      const redirectUrl = new URL('/', request.nextUrl.origin);
      redirectUrl.searchParams.set('spotify_error', 'no_code');
      return NextResponse.redirect(redirectUrl);
    }

    console.log('Getting access token with code...');
    let tokens;
    try {
      tokens = await getAccessToken(code);
      console.log('Access token received');
    } catch (tokenError: any) {
      console.error('Token exchange failed:', tokenError?.message || tokenError);
      const redirectUrl = new URL('/', request.nextUrl.origin);
      redirectUrl.searchParams.set('spotify_error', 'token_exchange_failed');
      redirectUrl.searchParams.set('error_details', tokenError?.message?.slice(0, 100) || 'unknown');
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUrl = new URL('/', request.nextUrl.origin);
    redirectUrl.searchParams.set('spotify_access_token', tokens.accessToken);
    redirectUrl.searchParams.set('spotify_refresh_token', tokens.refreshToken);

    try {
      const user = await getCurrentUser(tokens.accessToken);
      redirectUrl.searchParams.set('spotify_user_id', user.id);
    } catch {
      console.warn('Could not fetch user info (quota mode?) — continuing without it');
    }

    console.log('Redirecting to home page...');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling Spotify callback:', error instanceof Error ? error.message : error);
    const redirectUrl = new URL('/', request.nextUrl.origin);
    redirectUrl.searchParams.set('spotify_error', 'auth_failed');
    redirectUrl.searchParams.set('error_details', error instanceof Error ? error.message.slice(0, 100) : 'unknown');
    return NextResponse.redirect(redirectUrl);
  }
}
