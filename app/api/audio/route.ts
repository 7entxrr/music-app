import { exec } from 'child_process';
import { promisify } from 'util';
import { NextRequest, NextResponse } from 'next/server';

const execAsync = promisify(exec);

// Cache resolved URLs for 4h (yt-dlp URLs expire ~6h)
const cache = new Map<string, { url: string; t: number }>();
const CACHE_TTL = 4 * 60 * 60 * 1000;

async function resolveAudioUrl(videoId: string): Promise<string | null> {
  const hit = cache.get(videoId);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.url;

  // -f 140 = AAC 128kbps (fastest to resolve, universally available)
  // fallback chain if 140 is missing
  const { stdout } = await execAsync(
    `yt-dlp -f "140/bestaudio[ext=m4a]/bestaudio" --get-url "https://www.youtube.com/watch?v=${videoId}"`,
    { timeout: 20000 }
  );

  const url = stdout.trim().split('\n')[0];
  if (!url) return null;

  cache.set(videoId, { url, t: Date.now() });
  return url;
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  try {
    const audioUrl = await resolveAudioUrl(videoId);
    if (!audioUrl) return NextResponse.json({ error: 'No audio URL found' }, { status: 404 });

    const range = req.headers.get('range');
    const upstream = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...(range ? { Range: range } : {}),
      },
      cache: 'no-store',
    });

    // Cached URL expired — evict so next request re-resolves via yt-dlp
    if (upstream.status === 403 || upstream.status === 410) {
      cache.delete(videoId);
      return NextResponse.json({ error: 'URL expired, retry' }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'audio/mp4');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'no-cache');
    const cl = upstream.headers.get('Content-Length');
    if (cl) headers.set('Content-Length', cl);
    const cr = upstream.headers.get('Content-Range');
    if (cr) headers.set('Content-Range', cr);

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error('[/api/audio] Failed for', videoId, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
