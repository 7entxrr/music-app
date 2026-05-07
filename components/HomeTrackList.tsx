"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Play, Pause, MoreHorizontal } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import type { EnrichedTrack, ItunesTrack } from "@/lib/types";

interface Props {
  tracks: ItunesTrack[];
}

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function HomeTrackList({ tracks }: Props) {
  const { setTrack, setQueue, track: currentTrack, isPlaying, toggle } = usePlayerStore();
  const [enriched, setEnriched] = useState<EnrichedTrack[]>(tracks.map((t) => ({ ...t })));

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      tracks.map(async (t) => {
        try {
          const res = await fetch(
            `/api/stream?artist=${encodeURIComponent(t.artists[0]?.name ?? "")}&track=${encodeURIComponent(t.name)}`
          );
          const data = await res.json();
          return { ...t, youtubeId: data.videoId ?? undefined } as EnrichedTrack;
        } catch {
          return t as EnrichedTrack;
        }
      })
    ).then((results) => {
      if (!cancelled) setEnriched(results);
    });
    return () => { cancelled = true; };
  }, []);

  const handlePlay = (track: EnrichedTrack) => {
    if (currentTrack?.id === track.id) {
      toggle();
    } else {
      setQueue(enriched);
      setTrack(track);
    }
  };

  return (
    <ul className="space-y-1">
      {enriched.map((track, i) => {
        const isActive = currentTrack?.id === track.id;
        return (
          <li
            key={track.id}
            onClick={() => handlePlay(track)}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              isActive ? "bg-[var(--accent-light)]" : "hover:bg-[var(--surface-2)]"
            }`}
          >
            {/* Number / play icon */}
            <div className="w-5 flex-shrink-0 flex items-center justify-center">
              <span className={`text-xs font-medium ${isActive ? "hidden" : "block group-hover:hidden"} text-[var(--muted)]`}>
                {i + 1}
              </span>
              <span className={`${isActive ? "flex" : "hidden group-hover:flex"} items-center justify-center`}>
                {isActive && isPlaying
                  ? <Pause className="w-3.5 h-3.5 text-[var(--accent)]" fill="currentColor" />
                  : <Play className="w-3.5 h-3.5 text-[var(--accent)]" fill="currentColor" />}
              </span>
            </div>

            {/* Artwork */}
            <div className="relative w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden">
              {track.artworkUrl ? (
                <Image src={track.artworkUrl} alt={track.name} fill className="object-cover" sizes="36px" />
              ) : (
                <div className="w-full h-full bg-[var(--surface-3)]" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold truncate ${isActive ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
                {track.name}
              </p>
              <p className="text-xs text-[var(--muted)] truncate">
                {track.artists?.map((a) => a.name).join(", ")}
              </p>
            </div>

            {/* More */}
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity flex-shrink-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Duration */}
            <span className="text-xs text-[var(--muted)] flex-shrink-0 w-8 text-right tabular-nums">
              {fmtMs(track.duration_ms)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
