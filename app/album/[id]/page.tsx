import { Suspense } from "react";
import TrackCard from "@/components/TrackCard";
import Image from "next/image";
import Link from "next/link";
import type { EnrichedTrack } from "@/lib/types";
import { itunesLookupAlbum } from "@/lib/itunes";
import { getYouTubeVideoId } from "@/lib/youtube";

interface Props {
  params: Promise<{ id: string }>;
}

async function AlbumContent({ id }: { id: string }) {
  const album = await itunesLookupAlbum(id);

  const enrichedTracks: EnrichedTrack[] = await Promise.all(
    album.tracks.map(async (t) => {
      const youtubeId = await getYouTubeVideoId(t.artists[0]?.name ?? "", t.name).catch(() => null);
      return { ...t, youtubeId: youtubeId ?? undefined };
    })
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {album.artworkUrl ? (
          <Image src={album.artworkUrl} alt={album.name} width={240} height={240} className="rounded-xl shadow-2xl flex-shrink-0" priority />
        ) : (
          <div className="w-60 h-60 rounded-xl bg-[var(--surface)] flex-shrink-0" />
        )}
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Album</p>
          <h1 className="text-3xl font-bold">{album.name}</h1>
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            {album.artists.map((a, i) => (
              <span key={a.id}>
                {i > 0 && <span className="mr-2">·</span>}
                <Link href={`/artist/${a.id}`} className="hover:text-[var(--foreground)] transition-colors">
                  {a.name}
                </Link>
              </span>
            ))}
            <span>·</span>
            <span>{album.release_date.slice(0, 4)}</span>
            <span>·</span>
            <span>{album.trackCount} songs</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {enrichedTracks.map((t) => (
          <TrackCard key={t.id} track={t} queue={enrichedTracks} />
        ))}
      </div>
    </div>
  );
}

export default async function AlbumPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Suspense fallback={<div className="flex gap-6"><div className="w-60 h-60 rounded-xl bg-[var(--surface)] animate-pulse" /></div>}>
        <AlbumContent id={id} />
      </Suspense>
    </div>
  );
}
