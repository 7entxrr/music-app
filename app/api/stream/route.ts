import { NextRequest, NextResponse } from "next/server";
import { getYouTubeCandidates } from "@/lib/youtube";

async function isEmbeddable(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { cache: "no-store", signal: AbortSignal.timeout(3000) }
    );
    return res.ok;
  } catch {
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
    const excludes = excludeParam ? excludeParam.split(",").filter(Boolean) : [];

    const candidates = await getYouTubeCandidates(artist, track, excludes);

    if (candidates.length === 0) {
      console.log(`[Stream] No candidates for "${track}"`);
      return NextResponse.json({ videoId: null });
    }

    const results = await Promise.all(
      candidates.map(async (id) => ({ id, ok: await isEmbeddable(id) }))
    );

    const videoId = results.find((r) => r.ok)?.id ?? null;
    return NextResponse.json({ videoId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Stream] Error for "${track}" by "${artist}":`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
