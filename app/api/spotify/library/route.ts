import { NextRequest, NextResponse } from 'next/server';
import { getAllUserSavedTracks, getUserPlaylists, getAllPlaylistTracks } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accessToken = searchParams.get('access_token');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    console.log('Fetching library with token length:', accessToken.length);

    // Fetch user's saved tracks (liked songs)
    console.log('Fetching saved tracks...');
    const savedTracks = await getAllUserSavedTracks(accessToken);
    console.log('Fetched saved tracks:', savedTracks.length);

    // Fetch user's playlists
    console.log('Fetching playlists...');
    const playlistsData = await getUserPlaylists(accessToken);
    const playlists = playlistsData.items;
    console.log('Fetched playlists:', playlists.length);

    // Fetch all tracks from all playlists
    const playlistTracks: any[] = [];
    for (const playlist of playlists) {
      try {
        const tracks = await getAllPlaylistTracks(accessToken, playlist.id);
        playlistTracks.push(...tracks);
        console.log(`Fetched tracks from ${playlist.name}:`, tracks.length);
      } catch (error) {
        console.error(`Error fetching tracks from playlist ${playlist.name}:`, error);
      }
    }

    // Combine all tracks and remove duplicates
    const allTracks = [...savedTracks, ...playlistTracks];
    const uniqueTracks = Array.from(
      new Map(allTracks.map(track => [track.id, track])).values()
    );

    console.log('Total unique tracks:', uniqueTracks.length);

    return NextResponse.json({
      savedTracks,
      playlists,
      playlistTracks,
      allTracks: uniqueTracks,
      total: uniqueTracks.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching Spotify library:', errorMessage);
    console.error('Full error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch library',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
