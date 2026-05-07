/**
 * Diagnostic endpoint to check Spotify configuration
 * Access at: /api/spotify/diagnostic
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
    hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    hasRedirectUri: !!process.env.SPOTIFY_REDIRECT_URI,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'NOT SET',
    clientIdLength: process.env.SPOTIFY_CLIENT_ID?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  };

  if (!config.hasClientId || !config.hasClientSecret || !config.hasRedirectUri) {
    return NextResponse.json(
      {
        status: 'ERROR',
        message: 'Missing Spotify environment variables',
        ...config,
        instructions: [
          '1. Go to https://developer.spotify.com/dashboard',
          '2. Create or select your application',
          '3. Copy Client ID and Client Secret',
          '4. For local dev: Add to .env.local (already configured)',
          '5. For Vercel: Add to Project Settings > Environment Variables',
          '6. Redirect URI must match exactly what\'s in Spotify app settings',
        ],
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      status: 'OK',
      message: 'All Spotify environment variables are configured',
      ...config,
    },
    { status: 200 }
  );
}
