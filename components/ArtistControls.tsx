"use client";

import { Play, Shuffle } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import type { EnrichedTrack } from "@/lib/types";

export default function ArtistControls({ tracks }: { tracks: EnrichedTrack[] }) {
  const { setTrack, setQueue, shuffle, toggleShuffle } = usePlayerStore();

  const handlePlay = () => {
    if (tracks.length === 0) return;
    setQueue(tracks);
    setTrack(tracks[0]);
  };

  const handleShuffle = () => {
    toggleShuffle();
    if (tracks.length === 0) return;
    setQueue(tracks);
    const random = tracks[Math.floor(Math.random() * tracks.length)];
    setTrack(random);
  };

  return (
    <div className="flex items-center gap-3 mt-5">
      <button
        onClick={handlePlay}
        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-md"
      >
        <Play className="w-4 h-4" fill="white" />
        Play
      </button>

      <button
        onClick={handleShuffle}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors ${
          shuffle
            ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-md"
            : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--accent)]"
        }`}
      >
        <Shuffle className="w-4 h-4" />
        {shuffle ? "Shuffle: On" : "Shuffle: Off"}
      </button>
    </div>
  );
}
