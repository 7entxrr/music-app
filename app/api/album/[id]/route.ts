import { NextResponse } from "next/server";
import { itunesLookupAlbum } from "@/lib/itunes";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/album/[id]">
) {
  const { id } = await ctx.params;
  try {
    const album = await itunesLookupAlbum(id);

    return NextResponse.json(
      album,
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
