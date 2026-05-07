import { NextRequest, NextResponse } from "next/server";
import { itunesSearch } from "@/lib/itunes";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const { tracks, artists, albums } = await itunesSearch(q);
    
    const suggestions = [
      ...tracks.slice(0, 5).map(t => ({ type: "track", id: t.id, name: t.name, subtitle: t.artists[0]?.name })),
      ...artists.slice(0, 3).map(a => ({ type: "artist", id: a.id, name: a.name, subtitle: a.genre })),
      ...albums.slice(0, 3).map(a => ({ type: "album", id: a.id, name: a.name, subtitle: a.artists[0]?.name }))
    ];

    return NextResponse.json(
      { suggestions },
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
