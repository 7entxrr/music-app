import { Suspense } from "react";
import ArtistHero from "@/components/ArtistHero";
import TrackCard from "@/components/TrackCard";
import Link from "next/link";
import Image from "next/image";
import type { EnrichedTrack } from "@/lib/types";
import { itunesLookupArtist } from "@/lib/itunes";
import { getYouTubeVideoId } from "@/lib/youtube";

interface Props {
  params: Promise<{ id: string }>;
}

async function ArtistContent({ id }: { id: string }) {
  const { artist, topTracks, albums } = await itunesLookupArtist(id);

  const enrichedTracks: EnrichedTrack[] = await Promise.all(
    topTracks.map(async (t) => {
      const youtubeId = await getYouTubeVideoId(t.artists[0]?.name ?? "", t.name).catch(() => null);
      return { ...t, youtubeId: youtubeId ?? undefined };
    })
  );

  return (
    <div className="space-y-10">
      <ArtistHero artist={artist} />

      {enrichedTracks.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Popular</h2>
          <div className="divide-y divide-[var(--border)]">
            {enrichedTracks.map((t) => (
              <TrackCard key={t.id} track={t} queue={enrichedTracks} />
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {albums.map((album) => (
              <Link key={album.id} href={`/album/${album.id}`} className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors">
                {album.artworkUrl ? (
                  <Image src={album.artworkUrl} alt={album.name} width={200} height={200} className="rounded-lg w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-[var(--surface-2)]" />
                )}
                <p className="text-sm font-medium truncate">{album.name}</p>
                <p className="text-xs text-[var(--muted)]">{album.release_date.slice(0, 4)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Suspense fallback={<div className="h-72 rounded-2xl bg-[var(--surface)] animate-pulse" />}>
        <ArtistContent id={id} />
      </Suspense>
    </div>
  );
}
