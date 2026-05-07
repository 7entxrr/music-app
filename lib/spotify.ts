import SpotifyWebApi from 'spotify-web-api-node';
import type { SpotifyTrack, SpotifyUser } from './types';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Validate environment variables
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_REDIRECT_URI) {
  console.error('Missing Spotify environment variables. Please check your .env.local file:');
  console.error('- SPOTIFY_CLIENT_ID');
  console.error('- SPOTIFY_CLIENT_SECRET');
  console.error('- SPOTIFY_REDIRECT_URI');
}

export function getSpotifyAuthUrl() {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-library-read',
    'user-library-modify',
    'playlist-read-private',
    'playlist-read-collaborative',
  ];

  return spotifyApi.createAuthorizeURL(scopes, 'state');
}

export async function getAccessToken(code: string) {
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);
    
    return {
      accessToken: data.body['access_token'],
      refreshToken: data.body['refresh_token'],
      expiresIn: data.body['expires_in'],
    };
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

export function setAccessToken(token: string) {
  spotifyApi.setAccessToken(token);
}

export async function getCurrentUser(accessToken: string): Promise<SpotifyUser> {
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.getMe();
  return {
    id: data.body.id,
    display_name: data.body.display_name || '',
    email: data.body.email || '',
    images: data.body.images || [],
  };
}

export async function getUserSavedTracks(accessToken: string, limit = 50, offset = 0): Promise<SpotifyTrack[]> {
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.getMySavedTracks({ limit, offset });
  
  return data.body.items.map((item: any) => ({
    id: item.track.id,
    name: item.track.name,
    artists: item.track.artists.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
    })),
    album: {
      id: item.track.album.id,
      name: item.track.album.name,
      images: item.track.album.images,
      release_date: item.track.album.release_date,
      total_tracks: item.track.album.total_tracks,
    },
    duration_ms: item.track.duration_ms,
    preview_url: item.track.preview_url,
    external_urls: item.track.external_urls,
    uri: item.track.uri,
  }));
}

export async function getAllUserSavedTracks(accessToken: string): Promise<SpotifyTrack[]> {
  const allTracks: SpotifyTrack[] = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const tracks = await getUserSavedTracks(accessToken, limit, offset);
    allTracks.push(...tracks);
    
    if (tracks.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return allTracks;
}

export async function getUserPlaylists(accessToken: string, limit = 50, offset = 0) {
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.getUserPlaylists({ limit, offset });
  return data.body;
}

export async function getPlaylistTracks(accessToken: string, playlistId: string, limit = 50, offset = 0) {
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.getPlaylistTracks(playlistId, { limit, offset });
  
  return data.body.items.map((item: any) => ({
    id: item.track.id,
    name: item.track.name,
    artists: item.track.artists.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
    })),
    album: {
      id: item.track.album.id,
      name: item.track.album.name,
      images: item.track.album.images,
      release_date: item.track.album.release_date,
      total_tracks: item.track.album.total_tracks,
    },
    duration_ms: item.track.duration_ms,
    preview_url: item.track.preview_url,
    external_urls: item.track.external_urls,
    uri: item.track.uri,
  }));
}

export async function getAllPlaylistTracks(accessToken: string, playlistId: string): Promise<SpotifyTrack[]> {
  const allTracks: SpotifyTrack[] = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const tracks = await getPlaylistTracks(accessToken, playlistId, limit, offset);
    allTracks.push(...tracks);
    
    if (tracks.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return allTracks;
}
