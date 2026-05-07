import { NextResponse } from "next/server";
import { itunesLookupAlbum } from "@/lib/itunes";
import { getYouTubeVideoId } from "@/lib/youtube";
import type { EnrichedTrack } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/album/[id]">
) {
  const { id } = await ctx.params;
  try {
    const album = await itunesLookupAlbum(id);
    
    const enrichedTracks: EnrichedTrack[] = await Promise.all(
      album.tracks.map(async (t) => {
        const youtubeId = await getYouTubeVideoId(t.artists[0]?.name ?? "", t.name).catch(() => null);
        return { ...t, youtubeId: youtubeId ?? undefined };
      })
    );

    return NextResponse.json(
      { ...album, tracks: enrichedTracks },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
