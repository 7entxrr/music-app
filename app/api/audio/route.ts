import { NextRequest, NextResponse } from 'next/server';

const urlCache = new Map<string, { url: string; mime: string; clen: number; t: number }>();
const CACHE_TTL = 4 * 60 * 60 * 1000;

async function resolveAudio(videoId: string) {
  const hit = urlCache.get(videoId);
  if (hit && Date.now() - hit.t < CACHE_TTL) {
    console.log(`[/api/audio] Cache hit for ${videoId}`);
    return hit;
  }

  try {
    const { Innertube, ClientType } = await import('youtubei.js');
    // generate_session_locally: no YouTube homepage fetch (Vercel IPs get consent pages)
    // retrieve_player: false: no player JS fetch (also fails on Vercel)
    // ANDROID client returns direct signed URLs that work without deciphering
    const yt = await Innertube.create({
      client_type: ClientType.ANDROID,
      generate_session_locally: true,
      retrieve_player: false,
    });
    const info = await yt.getBasicInfo(videoId);

    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (!format) {
      console.warn(`⚠️ [/api/audio] No audio format found for ${videoId}`);
      return null;
    }

    const url = format.url ?? null;
    if (!url) {
      console.error(`❌ [/api/audio] Audio extraction failed for ${videoId}: no URL in format`);
      return null;
    }

    const mime = (format.mime_type ?? 'audio/mp4').split(';')[0];
    const clen = Number(format.content_length ?? 0);

    console.log(`✅ [/api/audio] Audio resolved for ${videoId}: mime=${mime} clen=${clen}`);
    const entry = { url, mime, clen, t: Date.now() };
    urlCache.set(videoId, entry);
    return entry;
  } catch (err) {
    console.error(`❌ [/api/audio] Audio extraction failed for ${videoId}:`, err);
    return null;
  }
}

const CHUNK = 524288; // 512 KB — YouTube 403s on full-file requests

function resolveRange(clientRange: string | null, clen: number): string {
  // Bounded range from client — pass through as-is
  if (clientRange && /^bytes=\d+-\d+$/.test(clientRange)) return clientRange;

  // Open-ended range: bytes=X-  → cap to X + CHUNK
  const openEnded = clientRange?.match(/^bytes=(\d+)-$/);
  if (openEnded) {
    const start = Number(openEnded[1]);
    const end = clen > 0 ? Math.min(start + CHUNK - 1, clen - 1) : start + CHUNK - 1;
    return `bytes=${start}-${end}`;
  }

  // No range header — request first chunk only
  const end = clen > 0 ? Math.min(CHUNK - 1, clen - 1) : CHUNK - 1;
  return `bytes=0-${end}`;
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
      console.error(`❌ [/api/audio] upstream ${upstream.status} — URL rejected by YouTube for ${videoId}`);
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
