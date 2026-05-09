"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat2, Plus, Volume2,
} from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";

export default function PlayerBar() {
  const {
    track, isPlaying, volume, currentTime, duration, shuffle,
    toggle, next, prev, toggleShuffle,
    setCurrentTime, setDuration, setVolume,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannedIdsRef = useRef<string[]>([]);

  // ── Step 1: resolve video ID ──────────────────────────────────────────────
  const fetchVideoId = (trackId: string, artist: string, name: string, banned: string[] = []) => {
    const excludeParam = banned.length > 0 ? `&exclude=${banned.join(",")}` : "";
    fetch(`/api/stream?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(name)}${excludeParam}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.videoId) {
          setVideoId(d.videoId);
        } else {
          console.log(`⏭️ [Player] No video found for "${name}", skipping`);
          next();
        }
      })
      .catch((err) => console.error(`[Player] Stream fetch failed for "${name}":`, err));
  };

  useEffect(() => {
    if (retryRef.current) clearTimeout(retryRef.current);
    bannedIdsRef.current = [];
    if (!track) return;
    if (track.youtubeId) setVideoId(track.youtubeId);
    else {
      setVideoId(null);
      fetchVideoId(track.id, track.artists[0]?.name ?? "", track.name, []);
    }
    return () => { if (retryRef.current) clearTimeout(retryRef.current); };
  }, [track?.id, track?.youtubeId]);

  // ── Step 2: load audio URL into <audio> ───────────────────────────────────
  useEffect(() => {
    if (!videoId) return;
    const audio = audioRef.current;
    if (!audio) return;

    fetch(`/api/audio?videoId=${encodeURIComponent(videoId)}`)
      .then((r) => r.json())
      .then((d) => {
        const url = d.audioUrl ?? d.url;
        if (!url) {
          console.error(`[Player] No audio URL for ${videoId}`);
          // treat same as embed error — try next candidate
          const t = usePlayerStore.getState().track;
          if (t && !t.youtubeId) {
            bannedIdsRef.current = [...bannedIdsRef.current, videoId];
            fetchVideoId(t.id, t.artists[0]?.name ?? "", t.name, bannedIdsRef.current);
          }
          return;
        }
        console.log(`✅ [Player] Loading audio for ${videoId}`);
        audio.src = url;
        audio.volume = usePlayerStore.getState().volume;
        if (usePlayerStore.getState().isPlaying) audio.play().catch(() => {});
      })
      .catch((err) => console.error(`[Player] Audio fetch failed for ${videoId}:`, err));
  }, [videoId]);

  // ── Step 3: play / pause ──────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  // ── Step 4: volume ────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // ── Step 5: wire audio events ─────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => next();
    const onError = () => {
      const t = usePlayerStore.getState().track;
      console.error(`[Player] Audio error for video ${videoId}`);
      if (videoId && t && !t.youtubeId) {
        bannedIdsRef.current = [...bannedIdsRef.current, videoId];
        if (bannedIdsRef.current.length >= 3) {
          console.log(`⏭️ [Player] All candidates failed for "${t.name}", skipping`);
          next();
        } else {
          fetchVideoId(t.id, t.artists[0]?.name ?? "", t.name, bannedIdsRef.current);
        }
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [videoId]);

  // ── Step 6: Media Session (lock screen / notification bar controls) ────────
  useEffect(() => {
    if (!track || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artists?.map((a) => a.name).join(", "),
      album: track.album?.name ?? "",
      artwork: track.artworkUrl
        ? [{ src: track.artworkUrl, sizes: "600x600", type: "image/jpeg" }]
        : undefined,
    });
    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current?.play();
      usePlayerStore.setState({ isPlaying: true });
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
      usePlayerStore.setState({ isPlaying: false });
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    navigator.mediaSession.setActionHandler("seekto", (d) => {
      if (d.seekTime != null && audioRef.current) {
        audioRef.current.currentTime = d.seekTime;
        setCurrentTime(d.seekTime);
      }
    });
  }, [track]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  if (!track) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed z-40 bg-[var(--surface)] border-t border-[var(--border)] shadow-lg"
      style={{ left: "var(--sidebar-w)", right: "var(--rightpanel-w)", bottom: "var(--bottomnav-h)" }}
    >
      {/* Native audio — never throttled in background */}
      <audio ref={audioRef} preload="auto" />

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

        {/* Track info */}
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

        {/* Controls */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 md:flex-none justify-center">
          <button
            onClick={toggleShuffle}
            className={`hidden sm:block transition-colors ${shuffle ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            aria-label="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>

          <button onClick={prev} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" aria-label="Previous">
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

          <button onClick={next} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" aria-label="Next">
            <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          <button className="hidden sm:block text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            <Repeat2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>

        {/* Volume */}
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

      {/* Progress bar */}
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
              if (audioRef.current) audioRef.current.currentTime = t;
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
