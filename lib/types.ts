export interface ItunesArtistRef {
  id: string;
  name: string;
}

export interface ItunesAlbumRef {
  id: string;
  name: string;
  images: { url: string }[];
  release_date: string;
  artists: ItunesArtistRef[];
}

export interface ItunesTrack {
  id: string;
  name: string;
  artists: ItunesArtistRef[];
  album: ItunesAlbumRef;
  duration_ms: number;
  preview_url: string | null;
  artworkUrl: string;
}

export interface ItunesArtist {
  id: string;
  name: string;
  genre: string;
  artworkUrl: string;
}

export interface ItunesAlbum {
  id: string;
  name: string;
  artists: ItunesArtistRef[];
  artworkUrl: string;
  release_date: string;
  trackCount: number;
}

export interface ItunesSearchResult {
  tracks: ItunesTrack[];
  artists: ItunesArtist[];
  albums: ItunesAlbum[];
}

export interface EnrichedTrack extends ItunesTrack {
  youtubeId?: string;
}

export interface PlayerState {
  track: EnrichedTrack | null;
  queue: EnrichedTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  spotifyToken: string | null;
  setTrack: (track: EnrichedTrack) => void;
  setQueue: (queue: EnrichedTrack[]) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setVolume: (v: number) => void;
  setSpotifyToken: (token: string | null) => void;
  next: () => void;
  prev: () => void;
}

export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string; height: number; width: number }[];
  release_date: string;
  total_tracks: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  uri: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}
