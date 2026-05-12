import { NextRequest, NextResponse } from 'next/server';

const urlCache = new Map<string, { url: string; mime: string; clen: number; t: number }>();
const CACHE_TTL = 4 * 60 * 60 * 1000;

async function resolveAudio(videoId: string) {
  const hit = urlCache.get(videoId);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit;

  // iOS client returns direct unciphered URLs without requiring authentication
  const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)',
      'X-YouTube-Client-Name': '5',
      'X-YouTube-Client-Version': '19.29.1',
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: 'IOS',
          clientVersion: '19.29.1',
          deviceMake: 'Apple',
          deviceModel: 'iPhone16,2',
          osName: 'iPhone',
          osVersion: '17.5.1.21F90',
          platform: 'MOBILE',
          hl: 'en',
          gl: 'US',
        },
      },
    }),
    signal: AbortSignal.timeout(8000),
  });

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
