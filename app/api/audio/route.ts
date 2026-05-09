import { NextRequest, NextResponse } from 'next/server';

const urlCache = new Map<string, { url: string; mime: string; clen: number; t: number }>();
const CACHE_TTL = 4 * 60 * 60 * 1000;

let sessionCache: { apiKey: string; visitorData: string; t: number } | null = null;
const SESSION_TTL = 60 * 60 * 1000;

async function getYouTubeSession(): Promise<{ apiKey: string; visitorData: string } | null> {
  if (sessionCache && Date.now() - sessionCache.t < SESSION_TTL) return sessionCache;

  try {
    const res = await fetch('https://www.youtube.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    const visitorDataMatch = html.match(/"visitorData":"([^"]+)"/);
    if (!apiKeyMatch || !visitorDataMatch) {
      console.error('[/api/audio] Could not extract session from YouTube homepage');
      return null;
    }

    sessionCache = { apiKey: apiKeyMatch[1], visitorData: visitorDataMatch[1], t: Date.now() };
    return sessionCache;
  } catch (err) {
    console.error('[/api/audio] Session fetch failed:', err);
    return null;
  }
}

async function resolveAudio(videoId: string) {
  const hit = urlCache.get(videoId);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit;

  const session = await getYouTubeSession();
  if (!session) return null;

  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${session.apiKey}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12; GB) gzip',
        'X-YouTube-Client-Name': '28',
        'X-YouTube-Client-Version': '1.65.10',
        'X-Goog-Visitor-Id': session.visitorData,
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID_VR',
            clientVersion: '1.65.10',
            deviceMake: 'Oculus',
            deviceModel: 'Quest 3',
            androidSdkVersion: 32,
            osName: 'Android',
            osVersion: '12',
            platform: 'MOBILE',
            hl: 'en',
            gl: 'US',
            visitorData: session.visitorData,
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!res.ok) {
    console.error(`[/api/audio] Innertube ${res.status} for ${videoId}`);
    return null;
  }

  const data = await res.json() as {
    playabilityStatus?: { status: string };
    streamingData?: { adaptiveFormats?: Array<{ mimeType?: string; bitrate?: number; contentLength?: string; url?: string }> };
  };

  const status = data.playabilityStatus?.status;
  if (status && status !== 'OK') {
    console.error(`[/api/audio] playabilityStatus=${status} for ${videoId}`);
    // Invalidate session on auth errors so next request fetches fresh one
    if (status === 'LOGIN_REQUIRED' || status === 'ERROR') sessionCache = null;
    return null;
  }

  const formats = (data.streamingData?.adaptiveFormats ?? []).filter(f => f.mimeType?.startsWith('audio/') && f.url);
  if (formats.length === 0) return null;

  formats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  const best = formats[0];

  const entry = {
    url: best.url!,
    mime: best.mimeType?.split(';')[0] ?? 'audio/mp4',
    clen: Number(best.contentLength ?? 0),
    t: Date.now(),
  };
  urlCache.set(videoId, entry);
  return entry;
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

  try {
    const audio = await resolveAudio(videoId);
    if (!audio) return NextResponse.json({ error: 'No audio stream found' }, { status: 404 });

    const range = resolveRange(req.headers.get('range'), audio.clen);
    const upstream = await fetch(audio.url, {
      headers: { Range: range },
      cache: 'no-store',
    });

    if (upstream.status === 403 || upstream.status === 410) {
      urlCache.delete(videoId);
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
    console.error('[/api/audio] Failed for', videoId, ':', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
