import { exec } from 'child_process';
import { promisify } from 'util';
import { NextRequest, NextResponse } from 'next/server';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const { stdout } = await execAsync(
      `yt-dlp -f "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best" --get-url "${url}"`,
      { timeout: 15000 }
    );
    const audioUrl = stdout.trim().split('\n')[0];

    if (!audioUrl) {
      return NextResponse.json({ error: 'No audio URL found' }, { status: 404 });
    }

    return NextResponse.json({ audioUrl });
  } catch (e: any) {
    console.error('[/api/audio] yt-dlp failed:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
