import { NextRequest, NextResponse } from 'next/server';
import { Innertube, ClientType } from 'youtubei.js';

const CHUNK = 524288; // 512 KB — YouTube 403s on full-file requests

// OAuth2 authenticated Innertube call → YouTube bypasses IP-based bot detection.
// Resolve AND proxy from the same Vercel function so the audio URL's IP lock matches.
export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: 'Missing or invalid videoId' }, { status: 400 });
  }

  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const accessToken = process.env.YOUTUBE_ACCESS_TOKEN ?? '';

  if (!refreshToken) {
    console.error('[/api/audio] YOUTUBE_REFRESH_TOKEN not configured');
    return NextResponse.json({ error: 'YouTube credentials not configured' }, { status: 500 });
  }

  try {
    // ANDROID client returns direct (non-cipher) audio URLs — no player JS needed.
    const yt = await Innertube.create({
      generate_session_locally: true,
      retrieve_player: false,
      client_type: ClientType.ANDROID,
    });

    // Init with stored credentials. Passing a past expiry forces an immediate refresh
    // so we always have a valid token even if the stored access_token has expired.
    await yt.session.oauth.init({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: new Date(0).toISOString(),
    });

    const info = await yt.getBasicInfo(videoId);
    const format = info.chooseFormat({ type: 'audio', quality: 'best', format: 'any' });

    const audioUrl = format?.url;
    if (!audioUrl) {
      console.error(`[/api/audio] No audio URL for ${videoId}`);
      return NextResponse.json({ error: 'No audio stream found' }, { status: 404 });
    }

    const clientRange = req.headers.get('range');
    const clen = Number(format.content_length ?? 0);
    const range = resolveRange(clientRange, clen);

    const upstream = await fetch(audioUrl, { headers: { Range: range } });

    if (upstream.status !== 206 && upstream.status !== 200) {
      console.error(`[/api/audio] YouTube returned ${upstream.status} for ${videoId}`);
      return NextResponse.json({ error: `YouTube returned ${upstream.status}` }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', format.mime_type?.split(';')[0] ?? 'audio/mp4');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'no-cache');

    const cl = upstream.headers.get('Content-Length');
    if (cl) headers.set('Content-Length', cl);
    const cr = upstream.headers.get('Content-Range');
    if (cr) headers.set('Content-Range', cr);

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[/api/audio] Error for ${videoId}:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function resolveRange(clientRange: string | null, clen: number): string {
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
