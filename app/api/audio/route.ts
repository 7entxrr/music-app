import { NextRequest, NextResponse } from 'next/server';

const WORKER_URL = process.env.YOUTUBE_PROXY_URL ?? 'https://music-yt-proxy.7entxr.workers.dev';

// Instead of proxying audio through Vercel (which has fixed datacenter IPs that YouTube blocks),
// redirect the browser directly to the Cloudflare Worker.
// The browser hits the nearest Cloudflare PoP → different regions = different egress IPs → better success rate.
export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  const workerAudioUrl = `${WORKER_URL}/audio/${videoId}`;
  console.log(`[/api/audio] Redirecting ${videoId} → ${workerAudioUrl}`);

  // 302 redirect — browser follows and hits the Worker directly
  return NextResponse.redirect(workerAudioUrl, { status: 302 });
}
