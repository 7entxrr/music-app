import { NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify';

export async function GET() {
  try {
    const authUrl = getSpotifyAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }
    console.error('Error generating Spotify auth URL:', errorMessage);
    
    // Check for missing credentials
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_REDIRECT_URI) {
      return NextResponse.json(
        { 
          error: 'Missing Spotify credentials',
          details: 'Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI in .env.local'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate auth URL', details: errorMessage },
      { status: 500 }
    );
  }
}
