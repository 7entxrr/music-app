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
    const tokens = await getAccessToken(code);
    console.log('Access token received, getting user info...');
    const user = await getCurrentUser(tokens.accessToken);
    console.log('User info received:', user.display_name);

    // Redirect to home page with tokens as query params (in production, use cookies or session)
    const redirectUrl = new URL('/', request.nextUrl.origin);
    redirectUrl.searchParams.set('spotify_access_token', tokens.accessToken);
    redirectUrl.searchParams.set('spotify_refresh_token', tokens.refreshToken);
    redirectUrl.searchParams.set('spotify_user_id', user.id);

    console.log('Redirecting to home page...');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling Spotify callback:', error);
    const redirectUrl = new URL('/', request.nextUrl.origin);
    redirectUrl.searchParams.set('spotify_error', 'auth_failed');
    return NextResponse.redirect(redirectUrl);
  }
}
