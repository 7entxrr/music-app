import { NextRequest, NextResponse } from "next/server";
import { getYouTubeVideoId } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist");
  const track = req.nextUrl.searchParams.get("track");
  if (!artist || !track)
    return NextResponse.json({ error: "Missing artist or track" }, { status: 400 });

  try {
    const videoId = await getYouTubeVideoId(artist, track);
    return NextResponse.json(
      { videoId },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
          'CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (err) {
    let errorMessage = 'Unknown error';
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'object' && err !== null) {
      errorMessage = JSON.stringify(err);
    } else {
      errorMessage = String(err);
    }
    console.error('YouTube API error for', artist, track, ':', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
