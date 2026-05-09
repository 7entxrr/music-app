// Uses YouTube's internal web API — no API key, no quota limits.
// This is the same API YouTube's own website uses for search.

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

// Extract up to 5 videoIds from YouTube's internal search response
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractVideoIds(data: any, max = 5): string[] {
  const ids: string[] = [];
  try {
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer?.contents;

    if (!Array.isArray(contents)) return ids;

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents;
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const videoId = item?.videoRenderer?.videoId;
        if (videoId) {
          ids.push(videoId);
          if (ids.length >= max) return ids;
        }
      }
    }
  } catch {
    // malformed response
  }
  return ids;
}

async function searchYouTubeInternal(query: string, attempt = 1): Promise<string[]> {
  const res = await fetch('https://www.youtube.com/youtubei/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    },
    body: JSON.stringify({
      query,
      params: 'EgIQAQ==', // filter: videos only
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20231219.01.00',
          hl: 'en',
          gl: 'US',
        },
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`YouTube internal search failed: ${res.status}`);
  }

  const data = await res.json();
  const videoIds = extractVideoIds(data);

  // Retry once if YouTube returned empty results (cold start / transient issue)
  if (videoIds.length === 0 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 500 * attempt));
    return searchYouTubeInternal(query, attempt + 1);
  }

  return videoIds;
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
      const ids = await searchYouTubeInternal(q);
      if (ids.length > 0) {
        console.log(`[YouTube] Found "${ct}" via: "${q}" → ${ids[0]}`);
        for (const id of ids) {
          if (!seen.has(id)) { seen.add(id); results.push(id); }
        }
        // Stop after first successful query that gives us enough candidates
        if (results.length >= 5) break;
      }
    } catch (err: unknown) {
      console.error(`[YouTube] Query failed: "${q}" →`, err instanceof Error ? err.message : err);
    }
  }

  if (results.length === 0) console.warn(`[YouTube] No video found for "${ct}" by "${ca}"`);
  return results;
}

// Returns the first non-excluded video ID (or null). Caches all candidates.
export async function getYouTubeVideoId(
  artist: string,
  track: string,
  excludeIds: string[] = []
): Promise<string | null> {
  const key = getCacheKey(artist, track);
  const cached = youtubeCache.get(key);

  const candidates: string[] = (() => {
    if (cached && Date.now() - cached.fetchedAt < YOUTUBE_CACHE_TTL) return cached.videoIds;
    return [];
  })();

  // If we have cached candidates, try to return one that isn't excluded
  if (candidates.length > 0) {
    const pick = candidates.find((id) => !excludeIds.includes(id));
    if (pick) return pick;
  }

  // Need to fetch (or refetch to find more candidates)
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
  return ids.find((id) => !excludeIds.includes(id)) ?? null;
}
