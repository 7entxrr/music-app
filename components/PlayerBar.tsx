"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat2, Plus, Volume2,
} from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function PlayerBar() {
  const {
    track, isPlaying, volume, currentTime, duration, shuffle,
    toggle, next, prev, toggleShuffle,
    setCurrentTime, setDuration, setVolume,
  } = usePlayerStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (window.YT?.Player) { setApiReady(true); return; }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
  }, []);

  useEffect(() => {
    if (!track) return;
    if (track.youtubeId) {
      setVideoId(track.youtubeId);
    } else {
      setVideoId(null);
      fetch(`/api/stream?artist=${encodeURIComponent(track.artists[0]?.name ?? "")}&track=${encodeURIComponent(track.name)}`)
        .then((r) => r.json())
        .then((d) => setVideoId(d.videoId ?? null))
        .catch(() => {});
    }
  }, [track?.id, track?.youtubeId]);

  useEffect(() => {
    if (!apiReady || !videoId || !containerRef.current) return;
    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
      return;
    }
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0 },
      events: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onReady: (e: any) => {
          e.target.setVolume(volume * 100);
          if (isPlaying) e.target.playVideo();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (e: any) => {
          if (e.data === window.YT.PlayerState.ENDED) next();
        },
      },
    });
  }, [apiReady, videoId]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.playVideo?.();
    else p.pauseVideo?.();
  }, [isPlaying]);

  useEffect(() => {
    playerRef.current?.setVolume?.(volume * 100);
  }, [volume]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setCurrentTime(p.getCurrentTime?.() ?? 0);
      setDuration(p.getDuration?.() ?? 0);
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying, setCurrentTime, setDuration]);

  if (!track) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed z-40 bg-[var(--surface)] border-t border-[var(--border)] shadow-lg"
      style={{ left: "var(--sidebar-w)", right: "var(--rightpanel-w)", bottom: "var(--bottomnav-h)" }}
    >
      {/* Hidden YT player */}
      <div
        ref={containerRef}
        style={{ position: "fixed", bottom: 0, left: "-9999px", width: 1, height: 1, pointerEvents: "none" }}
      />

      {/* Main row: art + info | controls | volume */}
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 pt-2.5 pb-1">

        {/* Artwork */}
        <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
          {track.artworkUrl ? (
            <Image src={track.artworkUrl} alt={track.name} fill className="object-cover" sizes="48px" />
          ) : (
            <div className="w-full h-full bg-[var(--surface-3)]" />
          )}
        </div>

        {/* Track info + add */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 md:flex-none md:w-52">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-semibold truncate text-[var(--foreground)]">{track.name}</p>
            <p className="text-[10px] md:text-xs text-[var(--muted)] truncate">
              {track.artists?.map((a) => a.name).join(", ")}
            </p>
          </div>
          <button className="flex-shrink-0 text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>

        {/* Controls — always visible, responsive sizes */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 md:flex-none justify-center">
          <button
            onClick={toggleShuffle}
            className={`hidden sm:block transition-colors ${shuffle ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            aria-label="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>

          <button
            onClick={prev}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Previous"
          >
            <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          <button
            onClick={toggle}
            className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-[var(--accent)] flex items-center justify-center hover:bg-[var(--accent-hover)] transition-colors shadow-md flex-shrink-0"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying
              ? <Pause className="w-4 h-4 text-white" fill="white" />
              : <Play className="w-4 h-4 text-white ml-0.5" fill="white" />}
          </button>

          <button
            onClick={next}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Next"
          >
            <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          <button className="hidden sm:block text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            <Repeat2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>

        {/* Volume — large screens only */}
        <div className="hidden lg:flex items-center gap-2 w-28 flex-shrink-0">
          <Volume2 className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
          <div className="flex-1 relative h-1 bg-[var(--border)] rounded-full">
            <div
              className="absolute left-0 top-0 h-full bg-[var(--accent)] rounded-full pointer-events-none"
              style={{ width: `${volume * 100}%` }}
            />
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            />
          </div>
        </div>
      </div>

      {/* Progress bar — always visible */}
      <div className="flex items-center gap-2 px-3 md:px-4 pb-2">
        <span className="text-[10px] text-[var(--muted)] tabular-nums w-7 text-right">{fmtTime(currentTime)}</span>
        <div className="flex-1 relative h-1 bg-[var(--border)] rounded-full">
          <div
            className="absolute left-0 top-0 h-full bg-[var(--accent)] rounded-full pointer-events-none"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range" min={0} max={duration || 100} value={currentTime}
            onChange={(e) => {
              const t = Number(e.target.value);
              setCurrentTime(t);
              playerRef.current?.seekTo?.(t, true);
            }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          />
        </div>
        <span className="text-[10px] text-[var(--muted)] tabular-nums w-7">{fmtTime(duration)}</span>
      </div>
    </div>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
