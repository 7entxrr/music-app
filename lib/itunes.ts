import type { ItunesTrack, ItunesArtist, ItunesAlbum, ItunesSearchResult } from "./types";
import { optimizedFetch } from "./fetch";

// In-memory LRU cache for iTunes API responses
const itunesCache = new Map<string, { data: any; fetchedAt: number }>();
const ITUNES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const ITUNES_CACHE_MAX_SIZE = 200;

function evictOldestIfNeeded() {
  if (itunesCache.size > ITUNES_CACHE_MAX_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, value] of itunesCache) {
      if (value.fetchedAt < oldestTime) {
        oldestTime = value.fetchedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) itunesCache.delete(oldestKey);
  }
}

function hiRes(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/\d+x\d+bb/, "600x600bb");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTrack(r: any): ItunesTrack {
  const artwork = hiRes(r.artworkUrl100);
  return {
    id: String(r.trackId),
    name: r.trackName,
    artists: [{ id: String(r.artistId), name: r.artistName }],
    album: {
      id: String(r.collectionId ?? ""),
      name: r.collectionName ?? "",
      images: [{ url: artwork }],
      release_date: r.releaseDate?.slice(0, 10) ?? "",
      artists: [{ id: String(r.artistId), name: r.artistName }],
    },
    duration_ms: r.trackTimeMillis ?? 0,
    preview_url: r.previewUrl ?? null,
    artworkUrl: artwork,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapArtist(r: any, artworkUrl = ""): ItunesArtist {
  return {
    id: String(r.artistId),
    name: r.artistName,
    genre: r.primaryGenreName ?? "",
    artworkUrl,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAlbum(r: any): ItunesAlbum {
  return {
    id: String(r.collectionId),
    name: r.collectionName,
    artists: [{ id: String(r.artistId), name: r.artistName }],
    artworkUrl: hiRes(r.artworkUrl100),
    release_date: r.releaseDate?.slice(0, 10) ?? "",
    trackCount: r.trackCount ?? 0,
  };
}

async function itunesGet(url: string) {
  const cached = itunesCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < ITUNES_CACHE_TTL) {
    return cached.data;
  }

  const res = await optimizedFetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    console.error(`[iTunes] API error ${res.status} for URL: ${url}`);
    throw new Error(`iTunes API error ${res.status}`);
  }
  const data = await res.json();
  
  evictOldestIfNeeded();
  itunesCache.set(url, { data, fetchedAt: Date.now() });
  
  return data;
}

export async function itunesSearch(term: string): Promise<ItunesSearchResult> {
  const q = encodeURIComponent(term);
  const [tracksData, artistsData, albumsData] = await Promise.all([
    itunesGet(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=20`),
    itunesGet(`https://itunes.apple.com/search?term=${q}&media=music&entity=musicArtist&limit=6`),
    itunesGet(`https://itunes.apple.com/search?term=${q}&media=music&entity=album&limit=8`),
  ]);

  // Build artistId → artwork map from song + album results (no extra API calls)
  const artistArtwork = new Map<number, string>();
  for (const r of [...(tracksData.results ?? []), ...(albumsData.results ?? [])]) {
    if (r.artistId && r.artworkUrl100 && !artistArtwork.has(r.artistId)) {
      artistArtwork.set(r.artistId, hiRes(r.artworkUrl100));
    }
  }

  const tracks: ItunesTrack[] = (tracksData.results ?? [])
    .filter((r: any) => r.wrapperType === "track")
    .map(mapTrack);

  const artists: ItunesArtist[] = (artistsData.results ?? [])
    .filter((r: any) => r.wrapperType === "artist")
    .map((r: any) => mapArtist(r, artistArtwork.get(r.artistId) ?? ""));

  const albums: ItunesAlbum[] = (albumsData.results ?? [])
    .filter((r: any) => r.wrapperType === "collection")
    .map(mapAlbum);

  return { tracks, artists, albums };
}

export async function itunesLookupArtist(id: string) {
  const [songsData, albumsData] = await Promise.all([
    itunesGet(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=10`),
    itunesGet(`https://itunes.apple.com/lookup?id=${id}&entity=album&limit=200`),
  ]);

  const artistRaw = songsData.results?.[0];
  const topSong = songsData.results?.find((r: any) => r.wrapperType === "track");
  const artworkUrl = topSong ? hiRes(topSong.artworkUrl100) : "";

  const artist: ItunesArtist = artistRaw
    ? mapArtist(artistRaw, artworkUrl)
    : { id, name: "Unknown Artist", genre: "", artworkUrl: "" };

  const topTracks: ItunesTrack[] = (songsData.results ?? [])
    .filter((r: any) => r.wrapperType === "track")
    .map(mapTrack);

  const albums: ItunesAlbum[] = (albumsData.results ?? [])
    .filter((r: any) => r.wrapperType === "collection")
    .map(mapAlbum);

  return { artist, topTracks, albums };
}

export async function itunesLookupAlbum(id: string) {
  const data = await itunesGet(
    `https://itunes.apple.com/lookup?id=${id}&entity=song`
  );

  const albumRaw = data.results?.[0];
  const tracks: ItunesTrack[] = (data.results ?? [])
    .filter((r: any) => r.wrapperType === "track")
    .map(mapTrack);

  return {
    id: String(albumRaw?.collectionId ?? id),
    name: albumRaw?.collectionName ?? "",
    artists: [{ id: String(albumRaw?.artistId ?? ""), name: albumRaw?.artistName ?? "" }],
    artworkUrl: hiRes(albumRaw?.artworkUrl100),
    release_date: albumRaw?.releaseDate?.slice(0, 10) ?? "",
    trackCount: albumRaw?.trackCount ?? tracks.length,
    tracks,
  };
}

export async function itunesLookupTrack(id: string): Promise<ItunesTrack | null> {
  const data = await itunesGet(`https://itunes.apple.com/lookup?id=${id}`);
  const raw = data.results?.[0];
  if (!raw || raw.wrapperType !== "track") return null;
  return mapTrack(raw);
}
