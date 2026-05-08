import { NextRequest, NextResponse } from 'next/server';
import { getAllUserSavedTracks, getUserPlaylists, getAllPlaylistTracks, refreshAccessToken, setAccessToken } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    console.log('Library API called with:', {
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length,
      hasRefreshToken: !!refreshToken,
      refreshTokenLength: refreshToken?.length,
    });

    if (!accessToken) {
      console.error('No access token provided');
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    console.log('Fetching library with token length:', accessToken.length);

    let savedTracks: any[] = [];
    let playlists: any[] = [];
    let playlistTracks: any[] = [];
    let newAccessToken: string | null = null;
    let newRefreshToken: string | null = null;

    // Try to fetch with current access token
    try {
      // Fetch user's saved tracks (liked songs)
      console.log('Fetching saved tracks...');
      savedTracks = await getAllUserSavedTracks(accessToken);
      console.log('Fetched saved tracks:', savedTracks.length);

      // Fetch user's playlists
      console.log('Fetching playlists...');
      const playlistsData = await getUserPlaylists(accessToken);
      playlists = playlistsData.items;
      console.log('Fetched playlists:', playlists.length);

      // Fetch all tracks from all playlists
      for (const playlist of playlists) {
        try {
          const tracks = await getAllPlaylistTracks(accessToken, playlist.id);
          playlistTracks.push(...tracks);
          console.log(`Fetched tracks from ${playlist.name}:`, tracks.length);
        } catch (error) {
          console.error(`Error fetching tracks from playlist ${playlist.name}:`, error);
        }
      }
    } catch (error: any) {
      console.error('Error in main fetch block:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error keys:', error ? Object.keys(error) : 'no error object');
      console.error('Error message:', error?.message);
      console.error('Error body:', error?.body);
      // If token is expired (401), try to refresh
      if (error?.statusCode === 401 && refreshToken) {
        console.log('Access token expired, attempting refresh...');
        try {
          const tokens = await refreshAccessToken(refreshToken);
          newAccessToken = tokens.accessToken;
          newRefreshToken = tokens.refreshToken;
          setAccessToken(newAccessToken);
          accessToken = newAccessToken;

          // Retry with new token
          console.log('Retrying with refreshed token...');
          savedTracks = await getAllUserSavedTracks(accessToken);
          console.log('Fetched saved tracks:', savedTracks.length);

          const playlistsData = await getUserPlaylists(accessToken);
          playlists = playlistsData.items;
          console.log('Fetched playlists:', playlists.length);

          for (const playlist of playlists) {
            try {
              const tracks = await getAllPlaylistTracks(accessToken, playlist.id);
              playlistTracks.push(...tracks);
              console.log(`Fetched tracks from ${playlist.name}:`, tracks.length);
            } catch (error) {
              console.error(`Error fetching tracks from playlist ${playlist.name}:`, error);
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          return NextResponse.json(
            { 
              error: 'Token expired and refresh failed',
              details: 'Please re-authenticate with Spotify',
              needsReauth: true
            },
            { status: 401 }
          );
        }
      } else {
        throw error;
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
      newAccessToken,
      newRefreshToken,
    });
  } catch (error) {
    let errorMessage = 'Unknown error';
    let statusCode = 500;
    
    console.error('Error in library API:', error);
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      // Handle spotify-web-api-node error format
      try {
        if ('body' in error && error.body) {
          errorMessage = typeof error.body === 'string' ? error.body : JSON.stringify(error.body);
          if ('statusCode' in error && typeof error.statusCode === 'number') {
            statusCode = error.statusCode;
          }
        } else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        } else {
          errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error));
        }
      } catch (e) {
        errorMessage = 'Error object could not be serialized';
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = String(error);
    }
    
    console.error('Error fetching Spotify library:', errorMessage);
    console.error('Full error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch library',
        details: errorMessage 
      },
      { status: statusCode }
    );
  }
}
