"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Heart,
  Repeat2,
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
    track, isPlaying, volume, currentTime, duration,
    toggle, next, prev,
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
      className="fixed bottom-0 z-40 flex items-center gap-5 px-5 py-3 bg-white/95 backdrop-blur-md border-t border-[var(--border)] shadow-lg"
      style={{ left: "var(--sidebar-w)", right: "var(--rightpanel-w)" }}
    >
      {/* Hidden YT player */}
      <div
        ref={containerRef}
        style={{ position: "fixed", bottom: 0, left: "-9999px", width: 1, height: 1, pointerEvents: "none" }}
      />

      {/* Track info */}
      <div className="flex items-center gap-3 w-56 flex-shrink-0">
        <div className="relative w-11 h-11 flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
          {track.artworkUrl ? (
            <Image src={track.artworkUrl} alt={track.name} fill className="object-cover" sizes="44px" />
          ) : (
            <div className="w-full h-full bg-[var(--surface-3)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate text-[var(--foreground)]">{track.name}</p>
          <p className="text-xs text-[var(--muted)] truncate">
            {track.artists?.map((a) => a.name).join(", ")}
          </p>
        </div>
        <button className="text-[var(--muted)] hover:text-rose-500 transition-colors flex-shrink-0">
          <Heart className="w-4 h-4" />
        </button>
      </div>

      {/* Controls + scrubber */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-5">
          <button
            onClick={prev}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Previous"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={toggle}
            className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center hover:bg-[var(--accent-hover)] transition-colors shadow-md"
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
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Scrubber */}
        <div className="flex items-center gap-2 w-full max-w-sm">
          <span className="text-[10px] text-[var(--muted)] w-8 text-right tabular-nums">{fmtTime(currentTime)}</span>
          <div className="flex-1 relative h-1.5 bg-[var(--border)] rounded-full">
            <div
              className="absolute left-0 top-0 h-full bg-[var(--accent)] rounded-full pointer-events-none"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const t = Number(e.target.value);
                setCurrentTime(t);
                playerRef.current?.seekTo?.(t, true);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            />
          </div>
          <span className="text-[10px] text-[var(--muted)] w-8 tabular-nums">{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Volume + repeat */}
      <div className="flex items-center gap-3 w-40 flex-shrink-0">
        <Volume2 className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
        <div className="flex-1 relative h-1.5 bg-[var(--border)] rounded-full">
          <div
            className="absolute left-0 top-0 h-full bg-[var(--accent)] rounded-full pointer-events-none"
            style={{ width: `${volume * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          />
        </div>
        <button className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors flex-shrink-0">
          <Repeat2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
