import { NextRequest, NextResponse } from "next/server";
import { itunesSearch } from "@/lib/itunes";
import type { EnrichedTrack } from "@/lib/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const { tracks, artists, albums } = await itunesSearch(q);

    // Don't pre-fetch YouTube IDs here — that burns API quota for every
    // keystroke. The player fetches the ID on demand via /api/stream when
    // the user actually clicks play.
    const enrichedTracks: EnrichedTrack[] = tracks;

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
    console.error('[/api/search] Unhandled error for query:', q, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
