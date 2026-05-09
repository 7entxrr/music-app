import { NextRequest, NextResponse } from 'next/server';

const PIPED_API = 'https://pipedapi.kavin.rocks';
const PIPED_FALLBACK = 'https://api.piped.projectsegfau.lt';

const urlCache = new Map<string, { url: string; mime: string; clen: number; t: number }>();
const CACHE_TTL = 2 * 60 * 60 * 1000;

interface PipedAudioStream {
  url: string;
  mimeType: string;
  bitrate: number;
  contentLength: string;
}

async function fetchPipedStreams(videoId: string, baseUrl: string): Promise<PipedAudioStream[]> {
  const res = await fetch(`${baseUrl}/streams/${videoId}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Piped streams failed: ${res.status}`);
  const data = await res.json();
  return (data?.audioStreams ?? []) as PipedAudioStream[];
}

async function resolveAudio(videoId: string) {
  const hit = urlCache.get(videoId);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit;

  let streams: PipedAudioStream[] = [];
  try {
    streams = await fetchPipedStreams(videoId, PIPED_API);
  } catch (err) {
    console.warn(`[/api/audio] Primary Piped failed for ${videoId}, trying fallback:`, err instanceof Error ? err.message : err);
    try {
      streams = await fetchPipedStreams(videoId, PIPED_FALLBACK);
    } catch (err2) {
      console.error(`[/api/audio] Both Piped instances failed for ${videoId}:`, err2 instanceof Error ? err2.message : err2);
      return null;
    }
  }

  if (streams.length === 0) return null;

  // Prefer opus (better compression) or mp4, pick highest bitrate
  const opusStreams = streams.filter((s) => s.mimeType?.includes('opus'));
  const candidates = opusStreams.length > 0 ? opusStreams : streams;
  const best = candidates.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

  const entry = {
    url: best.url,
    mime: best.mimeType?.split(';')[0] ?? 'audio/mp4',
    clen: Number(best.contentLength ?? 0),
    t: Date.now(),
  };
  urlCache.set(videoId, entry);
  return entry;
}

function resolveRange(clientRange: string | null, clen: number): string | null {
  if (!clientRange) return clen > 0 ? `bytes=0-${clen - 1}` : null;
  if (!/bytes=\d+-$/.test(clientRange)) return clientRange;
  const start = clientRange.match(/bytes=(\d+)-/)?.[1] ?? '0';
  return clen > 0 ? `bytes=${start}-${clen - 1}` : `bytes=${start}-`;
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  try {
    const audio = await resolveAudio(videoId);
    if (!audio) return NextResponse.json({ error: 'No audio stream found' }, { status: 404 });

    const range = resolveRange(req.headers.get('range'), audio.clen);
    const fetchHeaders: Record<string, string> = {};
    if (range) fetchHeaders['Range'] = range;

    const upstream = await fetch(audio.url, {
      headers: fetchHeaders,
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
