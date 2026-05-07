"use client";

import Image from "next/image";
import { Play, Pause } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import type { EnrichedTrack } from "@/lib/types";

interface Props {
  track: EnrichedTrack;
  queue?: EnrichedTrack[];
}

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function TrackCard({ track, queue = [] }: Props) {
  const { setTrack, setQueue, track: currentTrack, isPlaying, toggle } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isActive) {
      toggle();
    } else {
      if (queue.length) setQueue(queue);
      setTrack(track);
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
        isActive ? "bg-[var(--accent-light)]" : "hover:bg-[var(--surface-2)]"
      }`}
      onClick={handlePlay}
    >
      <div className="relative flex-shrink-0 w-12 h-12">
        {track.artworkUrl ? (
          <Image
            src={track.artworkUrl}
            alt={track.album?.name ?? track.name}
            fill
            className="rounded-lg object-cover"
            sizes="48px"
          />
        ) : (
          <div className="w-full h-full rounded-lg bg-[var(--surface-2)]" />
        )}
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
          aria-label={isActive && isPlaying ? "Pause" : "Play"}
        >
          {isActive && isPlaying
            ? <Pause className="w-4 h-4 text-white" fill="white" />
            : <Play className="w-4 h-4 text-white ml-0.5" fill="white" />}
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate ${isActive ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
          {track.name}
        </p>
        <p className="text-xs text-[var(--muted)] truncate">
          {track.artists?.map((a) => a.name).join(", ")}
        </p>
      </div>

      <span className="text-xs text-[var(--muted)] flex-shrink-0 tabular-nums">
        {fmtMs(track.duration_ms)}
      </span>
    </div>
  );
}
