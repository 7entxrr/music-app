import { NextRequest, NextResponse } from 'next/server';

const urlCache = new Map<string, { url: string; mime: string; clen: number; t: number }>();
const CACHE_TTL = 4 * 60 * 60 * 1000;

// Well-known public Innertube API key — stable across years, no scraping needed
const PUBLIC_INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

let sessionCache: { apiKey: string; visitorData: string; t: number } | null = null;
const SESSION_TTL = 60 * 60 * 1000;

async function getYouTubeSession(): Promise<{ apiKey: string; visitorData: string }> {
  if (sessionCache && Date.now() - sessionCache.t < SESSION_TTL) {
    console.log('[/api/audio] Using cached session');
    return sessionCache;
  }

  // Try to scrape a fresh visitorData from the homepage; fall back to empty string
  let visitorData = '';
  try {
    console.log('[/api/audio] Fetching visitorData from YouTube homepage...');
    const res = await fetch('https://www.youtube.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    console.log('[/api/audio] YouTube homepage status:', res.status);
    if (res.ok) {
      const html = await res.text();
      const visitorDataMatch = html.match(/"visitorData":"([^"]+)"/);
      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      if (visitorDataMatch) visitorData = visitorDataMatch[1];
      console.log('[/api/audio] visitorData found:', !!visitorData, '| apiKey from page:', !!apiKeyMatch);
    }
  } catch (err) {
    console.error('[/api/audio] Homepage fetch threw (using fallback key):', err);
  }

  // Always use the public key — scraping is just for visitorData enrichment
  sessionCache = { apiKey: PUBLIC_INNERTUBE_KEY, visitorData, t: Date.now() };
  console.log('[/api/audio] Session ready. visitorData:', visitorData ? 'present' : 'empty');
  return sessionCache;
}

// Try ANDROID_VR client first, fall back to ANDROID if it fails
const CLIENTS = [
  {
    name: 'ANDROID_VR',
    clientName: 'ANDROID_VR',
    clientVersion: '1.65.10',
    userAgent: 'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12; GB) gzip',
    clientNameInt: '28',
    extra: { deviceMake: 'Oculus', deviceModel: 'Quest 3', androidSdkVersion: 32, osName: 'Android', osVersion: '12', platform: 'MOBILE' },
  },
  {
    name: 'ANDROID',
    clientName: 'ANDROID',
    clientVersion: '19.09.37',
    userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
    clientNameInt: '3',
    extra: { androidSdkVersion: 30, osName: 'Android', osVersion: '11', platform: 'MOBILE' },
  },
  {
    name: 'IOS',
    clientName: 'IOS',
    clientVersion: '19.09.3',
    userAgent: 'com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)',
    clientNameInt: '5',
    extra: { deviceMake: 'Apple', deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '17.5.1', platform: 'MOBILE' },
  },
];

async function tryClient(
  client: typeof CLIENTS[number],
  videoId: string,
  session: { apiKey: string; visitorData: string }
) {
  console.log(`[/api/audio] Trying client ${client.name} for videoId=${videoId}`);
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${session.apiKey}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': client.userAgent,
        'X-YouTube-Client-Name': client.clientNameInt,
        'X-YouTube-Client-Version': client.clientVersion,
        'X-Goog-Visitor-Id': session.visitorData,
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: client.clientName,
            clientVersion: client.clientVersion,
            ...client.extra,
            hl: 'en',
            gl: 'US',
            visitorData: session.visitorData,
          },
        },
      }),
      signal: AbortSignal.timeout(10000),
    }
  );

  console.log(`[/api/audio] Innertube ${client.name} response status:`, res.status);
  if (!res.ok) {
    console.error(`[/api/audio] Innertube ${client.name} returned ${res.status} for ${videoId}`);
    return null;
  }

  const data = await res.json() as {
    playabilityStatus?: { status: string; reason?: string };
    streamingData?: {
      adaptiveFormats?: Array<{ mimeType?: string; bitrate?: number; contentLength?: string; url?: string }>;
      formats?: Array<{ mimeType?: string; bitrate?: number; contentLength?: string; url?: string }>;
    };
  };

  const status = data.playabilityStatus?.status;
  console.log(`[/api/audio] playabilityStatus for ${videoId} (${client.name}): ${status} — ${data.playabilityStatus?.reason ?? ''}`);

  if (status && status !== 'OK') {
    if (status === 'LOGIN_REQUIRED' || status === 'ERROR') sessionCache = null;
    return null;
  }

  const adaptiveAudio = (data.streamingData?.adaptiveFormats ?? []).filter(f => f.mimeType?.startsWith('audio/') && f.url);
  const allFormats = (data.streamingData?.formats ?? []).filter(f => f.url);
  const audioFormats = adaptiveAudio.length > 0 ? adaptiveAudio : allFormats;

  console.log(`[/api/audio] Audio formats found for ${videoId} (${client.name}): ${audioFormats.length}`);

  if (audioFormats.length === 0) return null;

  audioFormats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return audioFormats[0];
}

async function resolveAudio(videoId: string) {
  const hit = urlCache.get(videoId);
  if (hit && Date.now() - hit.t < CACHE_TTL) {
    console.log(`[/api/audio] Cache hit for ${videoId}`);
    return hit;
  }

  const session = await getYouTubeSession();

  for (const client of CLIENTS) {
    const best = await tryClient(client, videoId, session);
    if (best) {
      const entry = {
        url: best.url!,
        mime: best.mimeType?.split(';')[0] ?? 'audio/mp4',
        clen: Number(best.contentLength ?? 0),
        t: Date.now(),
      };
      urlCache.set(videoId, entry);
      console.log(`[/api/audio] Resolved audio for ${videoId} via ${client.name}: mime=${entry.mime} clen=${entry.clen}`);
      return entry;
    }
  }

  console.error(`[/api/audio] All clients failed for videoId=${videoId}`);
  return null;
}

function resolveRange(clientRange: string | null, clen: number): string {
  if (!clientRange) return `bytes=0-${clen - 1}`;
  if (!/bytes=\d+-$/.test(clientRange)) return clientRange;
  const start = clientRange.match(/bytes=(\d+)-/)?.[1] ?? '0';
  return `bytes=${start}-${clen - 1}`;
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  console.log(`[/api/audio] GET request for videoId=${videoId}`);

  try {
    const audio = await resolveAudio(videoId);
    if (!audio) {
      console.error(`[/api/audio] No audio resolved for videoId=${videoId}`);
      return NextResponse.json({ error: 'No audio stream found' }, { status: 404 });
    }

    const range = resolveRange(req.headers.get('range'), audio.clen);
    console.log(`[/api/audio] Proxying range="${range}" for videoId=${videoId}`);

    const upstream = await fetch(audio.url, {
      headers: { Range: range },
      cache: 'no-store',
    });

    console.log(`[/api/audio] Upstream response status: ${upstream.status} for videoId=${videoId}`);

    if (upstream.status === 403 || upstream.status === 410) {
      urlCache.delete(videoId);
      console.error(`[/api/audio] Upstream URL expired (${upstream.status}) for videoId=${videoId}`);
      return NextResponse.json({ error: 'URL expired, retry' }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', audio.mime);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'no-cache');
    const cl = upstream.headers.get('Content-Length');
    if (cl) headers.set('Content-Length', cl);
    const cr = upstream.headers.get('Content-Range');
    if (cr) headers.set('Content-Range', cr);

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error('[/api/audio] Unhandled error for', videoId, ':', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
