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
  const getStoreState = usePlayerStore.getState;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const bannedIdsRef = useRef<string[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (window.YT?.Player) { setApiReady(true); return; }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
  }, []);

  const fetchVideoId = (trackId: string, artist: string, name: string, banned: string[] = []) => {
    const excludeParam = banned.length > 0 ? `&exclude=${banned.join(",")}` : "";
    fetch(`/api/stream?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(name)}${excludeParam}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.videoId) {
          console.log(`[Player] Video ID resolved for "${name}": ${d.videoId}`);
          retryCountRef.current = 0;
          setVideoId(d.videoId);
        } else {
          console.warn(`[Player] No embeddable video for "${name}", skipping to next song`);
          next();
        }
      })
      .catch((err) => console.error(`[Player] Fetch failed for "${name}":`, err));
  };

  useEffect(() => {
    if (retryRef.current) clearTimeout(retryRef.current);
    retryCountRef.current = 0;
    bannedIdsRef.current = [];
    if (!track) return;
    if (track.youtubeId) {
      setVideoId(track.youtubeId);
    } else {
      setVideoId(null);
      fetchVideoId(track.id, track.artists[0]?.name ?? '', track.name, []);
    }
    return () => { if (retryRef.current) clearTimeout(retryRef.current); };
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
          console.log(`[Player] YouTube player ready for video: ${videoId}`);
          e.target.setVolume(volume * 100);
          if (isPlaying) e.target.playVideo();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (e: any) => {
          const states: Record<number, string> = { [-1]: 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' };
          console.log(`[Player] State changed: ${states[e.data] ?? e.data}`);
          if (e.data === window.YT.PlayerState.ENDED) next();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (e: any) => {
          const errors: Record<number, string> = { 2: 'invalid video ID', 5: 'HTML5 player error', 100: 'video removed/private', 101: 'embedding not allowed', 150: 'embedding not allowed' };
          console.error(`❌ [Player] ${videoId}: ${errors[e.data] ?? `code ${e.data}`}`);
          if ((e.data === 101 || e.data === 150) && videoId) {
            const currentTrack = usePlayerStore.getState().track;
            if (currentTrack && !currentTrack.youtubeId) {
              bannedIdsRef.current = [...bannedIdsRef.current, videoId];
              console.log(`🔄 Trying next embeddable video, banned: [${bannedIdsRef.current.join(', ')}]`);
              fetchVideoId(currentTrack.id, currentTrack.artists[0]?.name ?? '', currentTrack.name, bannedIdsRef.current);
            }
          }
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

  // Media Session API — enables background playback + OS media controls
  useEffect(() => {
    if (!track || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artists?.map((a) => a.name).join(', '),
      album: track.album?.name ?? '',
      artwork: track.artworkUrl
        ? [{ src: track.artworkUrl, sizes: '600x600', type: 'image/jpeg' }]
        : undefined,
    });
    navigator.mediaSession.setActionHandler('play', () => {
      playerRef.current?.playVideo?.();
      usePlayerStore.setState({ isPlaying: true });  // eslint-disable-line
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      playerRef.current?.pauseVideo?.();
      usePlayerStore.setState({ isPlaying: false }); // eslint-disable-line
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (d.seekTime != null) {
        playerRef.current?.seekTo?.(d.seekTime, true);
        setCurrentTime(d.seekTime);
      }
    });
  }, [track]);

  // Keep OS media controls in sync with play state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Silent Web Audio node — registers this tab as having active audio output.
  // Without this, Chrome suspends the YouTube iframe when the tab goes to background.
  useEffect(() => {
    const setup = () => {
      if (audioCtxRef.current) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001; // inaudible but non-zero — prevents Chrome from throttling background tabs
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      audioCtxRef.current = ctx;
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    // AudioContext requires a prior user gesture on Chrome
    document.addEventListener('click', setup, { once: true });
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('click', setup);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Resume playback if Chrome throttled the tab while hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && playerRef.current) {
        const { isPlaying } = getStoreState();
        const state = playerRef.current.getPlayerState?.();
        if (isPlaying && state !== window.YT?.PlayerState?.PLAYING) {
          playerRef.current.playVideo?.();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Polling keepalive while tab is hidden.
  // Chrome throttles timers in background tabs, but the poll still fires ~once/min
  // as a safety net to restart the player if it was paused.
  useEffect(() => {
    let hiddenInterval: ReturnType<typeof setInterval> | null = null;
    let swChannel: MessageChannel | null = null;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Use service worker to keep the app alive
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          swChannel = new MessageChannel();
          navigator.serviceWorker.controller.postMessage(
            { type: 'KEEP_ALIVE' },
            [swChannel.port2]
          );
          swChannel.port1.onmessage = () => {
            // Service worker is alive, keep polling
          };
        }

        hiddenInterval = setInterval(() => {
          const { isPlaying } = getStoreState();
          const p = playerRef.current;
          if (p && isPlaying && p.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING) {
            p.playVideo?.();
          }
        }, 1000);
      } else {
        if (hiddenInterval) { clearInterval(hiddenInterval); hiddenInterval = null; }
        if (swChannel) { swChannel.port1.close(); swChannel = null; }
        // Immediate check on tab focus
        const { isPlaying } = getStoreState();
        const p = playerRef.current;
        if (p && isPlaying && p.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING) {
          p.playVideo?.();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (hiddenInterval) clearInterval(hiddenInterval);
      if (swChannel) { swChannel.port1.close(); }
    };
  }, []);

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
