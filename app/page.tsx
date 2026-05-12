import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Play } from "lucide-react";
import { itunesSearch } from "@/lib/itunes";
import type { ItunesTrack } from "@/lib/types";
import HomeTrackList from "@/components/HomeTrackList";
import SpotifyButton from "@/components/SpotifyButton";
import SpotifyTokenCapture from "@/components/SpotifyTokenCapture";
import SpotifyErrorDisplay from "@/components/SpotifyErrorDisplay";
import SearchBar from "@/components/SearchBar";

async function getHomeData() {
  try {
    const [releases, recent] = await Promise.all([
      itunesSearch("top hits 2024"),
      itunesSearch("chill indie 2024"),
    ]);
    return {
      releaseTracks: releases.tracks.slice(0, 5),
      recentTracks: recent.tracks.slice(0, 6),
    };
  } catch {
    return { releaseTracks: [], recentTracks: [] };
  }
}

export default async function HomePage() {
  const { releaseTracks, recentTracks } = await getHomeData();
  const hero = releaseTracks[0];

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <SpotifyTokenCapture />
      </Suspense>
      <Suspense fallback={null}>
        <SpotifyErrorDisplay />
      </Suspense>
      
      {/* Search Bar */}
      <section className="flex justify-center py-4 bg-[var(--surface)] rounded-xl mx-4 md:mx-6">
        <SearchBar />
      </section>
      
      {/* Spotify Login Section */}
      <section className="flex justify-center py-4">
        <SpotifyButton />
      </section>

      {/* Releases for You */}
      <section>
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Releases for You</h2>

        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 bg-[var(--surface)] rounded-2xl p-4 shadow-sm">
          {/* Hero Album Art */}
          {hero && (
            <div className="flex-shrink-0 relative w-full sm:w-48 h-40 sm:h-48 rounded-xl overflow-hidden shadow-md">
              {hero.artworkUrl ? (
                <Image
                  src={hero.artworkUrl}
                  alt={hero.album?.name ?? hero.name}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              ) : (
                <div className="w-full h-full bg-[var(--surface-3)]" />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-xs font-bold truncate">{hero.album?.name ?? hero.name}</p>
                <p className="text-white/70 text-[10px] truncate">{hero.artists?.map((a) => a.name).join(", ")}</p>
              </div>
            </div>
          )}

          {/* Track list */}
          <div className="flex-1 min-w-0">
            <HomeTrackList tracks={releaseTracks} />
          </div>
        </div>
      </section>

      {/* Recently Played */}
      <section>
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Recently Played</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {recentTracks.map((track) => (
            <RecentCard key={track.id} track={track} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RecentCard({ track }: { track: ItunesTrack }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(track.name)}`}
      className="flex-shrink-0 w-36 group"
    >
      <div className="relative w-36 h-36 rounded-xl overflow-hidden shadow-sm mb-2">
        {track.artworkUrl ? (
          <Image
            src={track.artworkUrl}
            alt={track.album?.name ?? track.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="144px"
          />
        ) : (
          <div className="w-full h-full bg-[var(--surface-3)] rounded-xl" />
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
          </div>
        </div>
      </div>
      <p className="text-xs font-semibold text-[var(--foreground)] truncate">{track.album?.name ?? track.name}</p>
      <p className="text-[10px] text-[var(--muted)] truncate">{track.artists?.map((a) => a.name).join(", ")}</p>
    </Link>
  );
}
