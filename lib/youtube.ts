import { optimizedFetch } from "./fetch";

// In-memory LRU cache for YouTube video IDs
const youtubeCache = new Map<string, { videoId: string; fetchedAt: number }>();
const YOUTUBE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const YOUTUBE_CACHE_MAX_SIZE = 500;

// In-flight deduplication for YouTube API calls
const inflightYouTube = new Map<string, Promise<string | null>>();

function getCacheKey(artist: string, track: string): string {
  return `${artist.toLowerCase().trim()}|${track.toLowerCase().trim()}`;
}

function evictOldestIfNeeded() {
  if (youtubeCache.size > YOUTUBE_CACHE_MAX_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, value] of youtubeCache) {
      if (value.fetchedAt < oldestTime) {
        oldestTime = value.fetchedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) youtubeCache.delete(oldestKey);
  }
}

export async function getYouTubeVideoId(artist: string, track: string): Promise<string | null> {
  const key = getCacheKey(artist, track);
  const cached = youtubeCache.get(key);
  
  if (cached && Date.now() - cached.fetchedAt < YOUTUBE_CACHE_TTL) {
    return cached.videoId;
  }

  // In-flight deduplication
  if (inflightYouTube.has(key)) {
    return inflightYouTube.get(key)!;
  }

  const promise = (async (): Promise<string | null> => {
    const q = `${artist} ${track} official audio`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoCategoryId=10&maxResults=5&key=${process.env.YOUTUBE_API_KEY}`;

    const res = await optimizedFetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
    const data = await res.json();
    const videoId = data.items?.[0]?.id?.videoId ?? null;
    
    if (videoId) {
      evictOldestIfNeeded();
      youtubeCache.set(key, { videoId, fetchedAt: Date.now() });
    }
    
    return videoId;
  })();

  inflightYouTube.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightYouTube.delete(key);
  }
}
