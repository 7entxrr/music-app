export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeVideoId } from '@/lib/youtube';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tracks } = body;

    if (!Array.isArray(tracks)) {
      return NextResponse.json({ error: 'tracks must be an array' }, { status: 400 });
    }

    // Batch fetch YouTube IDs with concurrency control
    const BATCH_SIZE = 5;
    const results: Array<{ artist: string; track: string; youtubeId: string | null }> = [];

    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async ({ artist, track }: { artist: string; track: string }) => {
          try {
            const youtubeId = await getYouTubeVideoId(artist, track);
            return { artist, track, youtubeId };
          } catch (e) {
            console.error(`Failed to fetch YouTube ID for ${artist} - ${track}:`, e);
            return { artist, track, youtubeId: null };
          }
        })
      );
      results.push(...batchResults);
    }

    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
          'CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (e: any) {
    console.error('[/api/youtube/batch] failed:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
