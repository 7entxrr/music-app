import { NextResponse } from "next/server";
import { itunesLookupTrack } from "@/lib/itunes";
import { getYouTubeVideoId } from "@/lib/youtube";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/track/[id]">
) {
  const { id } = await ctx.params;
  try {
    const track = await itunesLookupTrack(id);
    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    const youtubeId = await getYouTubeVideoId(track.artists[0]?.name ?? "", track.name).catch(() => null);
    return NextResponse.json(
      { ...track, youtubeId: youtubeId ?? undefined },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
          'CDN-Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
