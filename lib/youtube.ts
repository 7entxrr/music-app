// Scrapes YouTube search HTML — no API key, works from any IP including Vercel's.

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

async function searchYouTubeHTML(query: string): Promise<string[]> {
  // sp=EgIQAQ== filters for videos only
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`YouTube search HTML failed: ${res.status}`);

  const html = await res.text();
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const m of html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
      if (ids.length >= 5) break;
    }
  }
  return ids;
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
      const ids = await searchYouTubeHTML(q);
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
