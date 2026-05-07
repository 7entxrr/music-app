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

    // Fetch user's saved tracks (liked songs)
    const savedTracks = await getAllUserSavedTracks(accessToken);

    // Fetch user's playlists
    const playlistsData = await getUserPlaylists(accessToken);
    const playlists = playlistsData.items;

    // Fetch all tracks from all playlists
    const playlistTracks: any[] = [];
    for (const playlist of playlists) {
      try {
        const tracks = await getAllPlaylistTracks(accessToken, playlist.id);
        playlistTracks.push(...tracks);
      } catch (error) {
        console.error(`Error fetching tracks from playlist ${playlist.name}:`, error);
      }
    }

    // Combine all tracks and remove duplicates
    const allTracks = [...savedTracks, ...playlistTracks];
    const uniqueTracks = Array.from(
      new Map(allTracks.map(track => [track.id, track])).values()
    );

    return NextResponse.json({
      savedTracks,
      playlists,
      playlistTracks,
      allTracks: uniqueTracks,
      total: uniqueTracks.length,
    });
  } catch (error) {
    console.error('Error fetching Spotify library:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library' },
      { status: 500 }
    );
  }
}
