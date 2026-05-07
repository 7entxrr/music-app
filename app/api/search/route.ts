import { NextRequest, NextResponse } from "next/server";
import { itunesSearch } from "@/lib/itunes";
import { getYouTubeVideoId } from "@/lib/youtube";
import type { EnrichedTrack } from "@/lib/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const { tracks, artists, albums } = await itunesSearch(q);

    const enrichedTracks: EnrichedTrack[] = await Promise.all(
      tracks.map(async (t) => {
        const youtubeId = await getYouTubeVideoId(t.artists[0]?.name ?? "", t.name)
          .catch((err) => {
            console.error(`YouTube API error for ${t.name}:`, err);
            return null;
          });
        return { ...t, youtubeId: youtubeId ?? undefined };
      })
    );

    return NextResponse.json(
      { tracks: enrichedTracks, artists, albums },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
