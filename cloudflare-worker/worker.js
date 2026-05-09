// Cloudflare Worker — proxies YouTube search and stream lookups.
// Cloudflare IPs are never blocked by YouTube.
// Deploy at: https://workers.cloudflare.com (free, 100k req/day)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

// --- YouTube audio stream via Innertube player API ---
async function getAudioStream(videoId) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
      'X-YouTube-Client-Name': '28',
      'X-YouTube-Client-Version': '1.56.21',
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: 'ANDROID_VR',
          clientVersion: '1.56.21',
          deviceMake: 'Oculus',
          deviceModel: 'Quest 2',
          androidSdkVersion: 32,
          osName: 'Android',
          osVersion: '12L',
          platform: 'MOBILE',
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Player API failed: ${res.status}`);
  const data = await res.json();

  const formats = data?.streamingData?.adaptiveFormats ?? [];
  const audioFormats = formats.filter(f => f.mimeType?.startsWith('audio/'));
  if (audioFormats.length === 0) return null;

  // Pick highest bitrate
  audioFormats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  const best = audioFormats[0];

  return {
    url: best.url,
    mime: best.mimeType?.split(';')[0] ?? 'audio/mp4',
    clen: Number(best.contentLength ?? 0),
    bitrate: best.bitrate,
  };
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

    // GET /streams/:videoId
    const streamMatch = url.pathname.match(/^\/streams\/([a-zA-Z0-9_-]{11})$/);
    if (streamMatch) {
      const videoId = streamMatch[1];
      try {
        const stream = await getAudioStream(videoId);
        if (!stream) return json({ error: 'No audio stream found' }, 404);
        return json(stream);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};
