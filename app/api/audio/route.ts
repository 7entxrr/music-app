export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

const urlCache = new Map<string, { url: string; mime: string; clen: number; t: number }>();
const CACHE_TTL = 4 * 60 * 60 * 1000;

// Direct Innertube player API — works locally and on Cloudflare (IPs not blocked).
// Blocked on Vercel Lambda/Edge — use YOUTUBE_PROXY_URL there instead.
async function resolveViaInnertube(videoId: string) {
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
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Innertube player failed: ${res.status}`);
  const data = await res.json() as { streamingData?: { adaptiveFormats?: Array<{ mimeType?: string; bitrate?: number; contentLength?: string; url?: string }> } };

  const formats = (data.streamingData?.adaptiveFormats ?? []).filter(f => f.mimeType?.startsWith('audio/'));
  if (formats.length === 0) return null;

  formats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  const best = formats[0];
  if (!best.url) return null;

  return {
    url: best.url,
    mime: best.mimeType?.split(';')[0] ?? 'audio/mp4',
    clen: Number(best.contentLength ?? 0),
  };
}

async function resolveAudio(videoId: string) {
  const hit = urlCache.get(videoId);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit;

  const proxyUrl = process.env.YOUTUBE_PROXY_URL;

  let result: { url: string; mime: string; clen: number } | null = null;

  if (proxyUrl) {
    try {
      const res = await fetch(`${proxyUrl}/streams/${videoId}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) result = await res.json() as { url: string; mime: string; clen: number };
    } catch {
      // fall through to direct Innertube
    }
  }

  if (!result) {
    result = await resolveViaInnertube(videoId);
  }

  if (!result?.url) return null;

  const entry = { ...result, t: Date.now() };
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
