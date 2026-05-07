import { NextResponse } from "next/server";
import { itunesLookupArtist } from "@/lib/itunes";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/artist/[id]">
) {
  const { id } = await ctx.params;
  try {
    const data = await itunesLookupArtist(id);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        'CDN-Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
