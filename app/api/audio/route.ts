import { Innertube, ClientType } from 'youtubei.js';
import { NextRequest, NextResponse } from 'next/server';

// Cache resolved audio info for 4h (YouTube signed URLs expire ~6h)
const urlCache = new Map<string, { url: string; mime: string; clen: number; t: number }>();
const CACHE_TTL = 4 * 60 * 60 * 1000;

let yt: Awaited<ReturnType<typeof Innertube.create>> | null = null;

async function getInnertube() {
  if (!yt) {
    // ANDROID_VR returns direct unsigned URLs that accept full-range requests
    yt = await Innertube.create({ generate_session_locally: false, client_type: ClientType.ANDROID_VR });
  }
  return yt;
}

async function resolveAudio(videoId: string) {
  const hit = urlCache.get(videoId);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit;

  const innertube = await getInnertube();
  const info = await innertube.getBasicInfo(videoId);

  const format =
    info.chooseFormat({ type: 'audio', quality: 'best', format: 'mp4' }) ??
    info.chooseFormat({ type: 'audio', quality: 'best' });

  const url = format?.url;
  if (!url) return null;

  const entry = {
    url,
    mime: (format.mime_type ?? 'audio/mp4').split(';')[0],
    clen: Number(format.content_length ?? 0),
    t: Date.now(),
  };
  urlCache.set(videoId, entry);
  return entry;
}

// Convert an open-ended Range header to a concrete one using known content length
function resolveRange(clientRange: string | null, clen: number): string {
  if (!clientRange) return `bytes=0-${clen - 1}`;
  // If already has end byte, use as-is
  if (!/bytes=\d+-$/.test(clientRange)) return clientRange;
  // Open-ended: "bytes=N-" → fill in end
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
      yt = null;
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
    yt = null;
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
