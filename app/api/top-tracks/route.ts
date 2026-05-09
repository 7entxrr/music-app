import { NextResponse } from "next/server";
import { itunesSearch } from "@/lib/itunes";
import { generateETag, etagMatches } from "@/lib/etag";

export async function GET(req: Request) {
  try {
    const { tracks } = await itunesSearch("top hits 2024");
    const enrichedTracks = tracks.slice(0, 20);

    const data = { tracks: enrichedTracks };
    const etag = generateETag(data);
    const ifNoneMatch = req.headers.get('if-none-match');

    if (etagMatches(ifNoneMatch, etag)) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'ETag': etag,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
