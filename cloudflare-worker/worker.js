// Cloudflare Worker — proxies YouTube search and audio streaming.
// Audio URL resolution uses parallel retries because YouTube's bot detection
// only blocks ~80% of datacenter requests; retrying gets through on the other 20%.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// --- YouTube search via HTML scraping ---
async function searchYouTube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);
  const html = await res.text();
  const seen = new Set();
  const ids = [];
  for (const m of html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); }
    if (ids.length >= 5) break;
  }
  return ids;
}

// Try one Innertube client for one video. Returns { url, mime, clen } or throws.
async function tryClient(videoId, client) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': client.userAgent,
      'X-YouTube-Client-Name': client.clientNameInt,
      'X-YouTube-Client-Version': client.clientVersion,
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: client.clientName,
          clientVersion: client.clientVersion,
          hl: 'en',
          gl: 'US',
          ...client.extra,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const playStatus = data?.playabilityStatus?.status;
  if (playStatus !== 'OK') throw new Error(`${playStatus}: ${data?.playabilityStatus?.reason}`);
  const formats = (data?.streamingData?.adaptiveFormats ?? [])
    .filter(f => f.mimeType?.startsWith('audio/') && f.url);
  if (formats.length === 0) throw new Error('No audio formats');
  formats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  const best = formats[0];
  return {
    url: best.url,
    mime: best.mimeType?.split(';')[0] ?? 'audio/mp4',
    clen: Number(best.contentLength ?? 0),
  };
}

const ANDROID = {
  userAgent: 'com.google.android.youtube/21.03.36(Linux; U; Android 16; en_US; SM-S908E Build/TP1A.220624.014) gzip',
  clientName: 'ANDROID', clientVersion: '21.03.36', clientNameInt: '3',
  extra: { androidSdkVersion: 36, osName: 'Android', osVersion: '16', platform: 'MOBILE' },
};
const IOS = {
  userAgent: 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)',
  clientName: 'iOS', clientVersion: '20.11.6', clientNameInt: '5',
  extra: { deviceMake: 'Apple', deviceModel: 'iPhone10,4', osName: 'iPhone', osVersion: '16.7.7.20H330', platform: 'MOBILE' },
};

// Try up to maxAttempts rounds. Each round fires ANDROID + iOS in parallel.
// Returns on the first success (whichever client wins the race).
async function getAudioStream(videoId, maxAttempts = 2) {
  const errors = [];
  for (let i = 0; i < maxAttempts; i++) {
    const result = await Promise.any([
      tryClient(videoId, ANDROID),
      tryClient(videoId, IOS),
    ]).catch(aggErr => {
      // AggregateError: all promises rejected
      errors.push(`round ${i + 1}: ${aggErr.errors?.map(e => e.message).join(' | ')}`);
      return null;
    });
    if (result) return { ...result, _attempts: i + 1 };
  }
  return { _errors: errors };
}

const CHUNK = 524288; // 512 KB — YouTube 403s on full-file requests

function resolveRange(clientRange, clen) {
  if (clientRange && /^bytes=\d+-\d+$/.test(clientRange)) return clientRange;
  const openEnded = clientRange?.match(/^bytes=(\d+)-$/);
  if (openEnded) {
    const start = Number(openEnded[1]);
    const end = clen > 0 ? Math.min(start + CHUNK - 1, clen - 1) : start + CHUNK - 1;
    return `bytes=${start}-${end}`;
  }
  const end = clen > 0 ? Math.min(CHUNK - 1, clen - 1) : CHUNK - 1;
  return `bytes=0-${end}`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // GET /search?q=query
    if (url.pathname === '/search') {
      const q = url.searchParams.get('q');
      if (!q) return json({ error: 'Missing q' }, 400);
      try {
        const ids = await searchYouTube(q);
        return json({ videoIds: ids });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // GET /streams/:videoId — JSON metadata (url, mime, clen)
    const streamMatch = url.pathname.match(/^\/streams\/([a-zA-Z0-9_-]{11})$/);
    if (streamMatch) {
      const videoId = streamMatch[1];
      const stream = await getAudioStream(videoId);
      if (!stream?.url) return json({ error: 'No audio stream found', debug: stream?._errors }, 404);
      return json(stream);
    }

    // GET /audio/:videoId — proxies audio bytes (URL is IP-locked; must fetch from same Worker)
    const audioMatch = url.pathname.match(/^\/audio\/([a-zA-Z0-9_-]{11})$/);
    if (audioMatch) {
      const videoId = audioMatch[1];
      const stream = await getAudioStream(videoId);
      if (!stream?.url) return json({ error: 'No audio stream found', debug: stream?._errors }, 404);

      const range = resolveRange(request.headers.get('Range'), stream.clen);
      const upstream = await fetch(stream.url, { headers: { Range: range } });

      if (upstream.status !== 206 && upstream.status !== 200) {
        return json({ error: `YouTube returned ${upstream.status}` }, 502);
      }

      const headers = new Headers(CORS);
      headers.set('Content-Type', stream.mime);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', 'no-cache');
      const cl = upstream.headers.get('Content-Length');
      if (cl) headers.set('Content-Length', cl);
      const cr = upstream.headers.get('Content-Range');
      if (cr) headers.set('Content-Range', cr);

      return new Response(upstream.body, { status: upstream.status, headers });
    }

    return json({ error: 'Not found' }, 404);
  },
};
