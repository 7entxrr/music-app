export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Fire-and-forget: warm audio cache for top tracks on server start
    setTimeout(async () => {
      try {
        const base = 'http://localhost:3000';
        const res = await fetch(`${base}/api/top-tracks`);
        const data = await res.json();
        const tracks: { youtubeId?: string }[] = data.tracks ?? [];
        const ids = tracks.map(t => t.youtubeId).filter(Boolean) as string[];
        console.log(`[warmup] Pre-fetching ${ids.length} audio URLs...`);
        // 3 at a time
        for (let i = 0; i < ids.length; i += 3) {
          await Promise.all(
            ids.slice(i, i + 3).map(id =>
              fetch(`${base}/api/audio?videoId=${id}`).catch(() => {})
            )
          );
        }
        console.log(`[warmup] Done — ${ids.length} tracks cached`);
      } catch (e) {
        console.error('[warmup] failed:', e);
      }
    }, 3000); // wait 3s for server to fully boot
  }
}
