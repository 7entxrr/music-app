// YouTube search: uses youtubei.js library for reliable searching

const youtubeCache = new Map<string, { videoIds: string[]; fetchedAt: number }>();
const YOUTUBE_CACHE_TTL = 24 * 60 * 60 * 1000;
const YOUTUBE_CACHE_MAX_SIZE = 500;
const inflightYouTube = new Map<string, Promise<string[]>>();

function getCacheKey(artist: string, track: string) {
  return `${artist.toLowerCase().trim()}|${track.toLowerCase().trim()}`;
}

function evictOldestIfNeeded() {
  if (youtubeCache.size <= YOUTUBE_CACHE_MAX_SIZE) return;
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [key, value] of youtubeCache) {
    if (value.fetchedAt < oldestTime) { oldestTime = value.fetchedAt; oldestKey = key; }
  }
  if (oldestKey) youtubeCache.delete(oldestKey);
}

function clean(s: string): string {
  return s
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\(ft\..*?\)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(from [""'].*?[""']\)/gi, '')
    .replace(/\(official.*?\)/gi, '')
    .replace(/\(audio.*?\)/gi, '')
    .replace(/\(video.*?\)/gi, '')
    .replace(/\(lyric.*?\)/gi, '')
    .replace(/\(slowed.*?\)/gi, '')
    .replace(/\(lofi.*?\)/gi, '')
    .replace(/\(remix.*?\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Use youtubei.js for reliable YouTube search
async function searchYouTubeWithLibrary(query: string): Promise<string[]> {
  try {
    const { Innertube } = await import('youtubei.js');
    const yt = await Innertube.create();
    const search = await yt.search(query);
    const ids: string[] = [];
    
    if (search.videos) {
      for (const video of search.videos) {
        if (video.type === 'Video' && video.id) {
          ids.push(video.id);
          if (ids.length >= 5) break;
        }
      }
    }
    
    return ids;
  } catch (err) {
    console.error('[YouTube] Library search failed:', err instanceof Error ? err.message : err);
    throw err;
  }
}

async function fetchAllCandidates(artist: string, track: string): Promise<string[]> {
  const ca = clean(artist);
  const ct = clean(track);

  const queries = [
    `${ca} ${ct} official audio`,
    `${ca} ${ct}`,
    `${ct} ${ca}`,
    `${ct} official audio`,
    ct,
  ];

  const seen = new Set<string>();
  const results: string[] = [];

  for (const q of queries) {
    try {
      const ids = await searchYouTube(q);
      if (ids.length > 0) {
        console.log(`[YouTube] Found "${ct}" via: "${q}" → ${ids[0]}`);
        for (const id of ids) {
          if (!seen.has(id)) { seen.add(id); results.push(id); }
        }
        if (results.length >= 5) break;
      }
    } catch (err: unknown) {
      console.error(`[YouTube] Query failed: "${q}" →`, err instanceof Error ? err.message : err);
    }
  }

  if (results.length === 0) console.warn(`[YouTube] No video found for "${ct}" by "${ca}"`);
  return results;
}

export async function getYouTubeCandidates(
  artist: string,
  track: string,
  excludeIds: string[] = []
): Promise<string[]> {
  const key = getCacheKey(artist, track);
  const cached = youtubeCache.get(key);

  if (cached && Date.now() - cached.fetchedAt < YOUTUBE_CACHE_TTL) {
    const filtered = cached.videoIds.filter((id) => !excludeIds.includes(id));
    if (filtered.length > 0) return filtered;
  }

  let promise = inflightYouTube.get(key);
  if (!promise) {
    promise = fetchAllCandidates(artist, track).then((ids) => {
      evictOldestIfNeeded();
      youtubeCache.set(key, { videoIds: ids, fetchedAt: Date.now() });
      return ids;
    });
    inflightYouTube.set(key, promise);
    promise.finally(() => inflightYouTube.delete(key));
  }

  const ids = await promise;
  return ids.filter((id) => !excludeIds.includes(id));
}

export async function getYouTubeVideoId(
  artist: string,
  track: string,
  excludeIds: string[] = []
): Promise<string | null> {
  const candidates = await getYouTubeCandidates(artist, track, excludeIds);
  return candidates[0] ?? null;
}
