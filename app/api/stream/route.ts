import { NextRequest, NextResponse } from "next/server";
import { getYouTubeCandidates } from "@/lib/youtube";

// Server-lifetime blocked ID cache — never re-checked once confirmed blocked
const blockedVideoIds = new Set<string>();

async function isEmbeddable(videoId: string): Promise<boolean> {
  if (blockedVideoIds.has(videoId)) {
    console.log(`⏭️ [Stream] Known blocked, skipping: ${videoId}`);
    return false;
  }
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { cache: "no-store", signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      console.log(`✅ [Stream] Embeddable: ${videoId}`);
      return true;
    }
    // 401 = embedding disabled by owner, 404 = video removed/private
    console.log(`❌ [Stream] Blocked (${res.status}): ${videoId}`);
    blockedVideoIds.add(videoId);
    return false;
  } catch {
    // Timeout or network error — don't block, let the player try
    return true;
  }
}

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist");
  const track = req.nextUrl.searchParams.get("track");
  if (!artist || !track)
    return NextResponse.json({ error: "Missing artist or track" }, { status: 400 });

  try {
    const excludeParam = req.nextUrl.searchParams.get("exclude");
    const clientExcludes = excludeParam ? excludeParam.split(",").filter(Boolean) : [];

    // Merge client-reported blocked IDs with server-known blocked IDs
    const allExcludes = [...new Set([...clientExcludes, ...blockedVideoIds])];

    const candidates = await getYouTubeCandidates(artist, track, allExcludes);

    if (candidates.length === 0) {
      console.log(`⏭️ [Stream] No candidates left for "${track}"`);
      return NextResponse.json({ videoId: null });
    }

    // Check all candidates in parallel — pick the first embeddable one (in order)
    const embeddable = await Promise.all(
      candidates.map(async (id) => ({ id, ok: await isEmbeddable(id) }))
    );

    const videoId = embeddable.find((r) => r.ok)?.id ?? null;

    if (!videoId) {
      console.log(`⏭️ [Stream] All candidates blocked for "${track}" by "${artist}"`);
    }

    return NextResponse.json({ videoId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [Stream] Error for "${track}" by "${artist}":`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
