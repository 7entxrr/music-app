import { NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify';

export async function GET() {
  try {
    const authUrl = getSpotifyAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating Spotify auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
