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
  const getStoreState = usePlayerStore.getState;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoIdRef = useRef<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const bannedIdsRef = useRef<string[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioRetryRef = useRef(0);

  const fetchVideoId = (artist: string, name: string, banned: string[] = [], track?: any) => {
    const excludeParam = banned.length > 0 ? `&exclude=${banned.join(",")}` : "";
    
    // Try YouTube first, fallback to iTunes preview
    fetch(`/api/stream?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(name)}${excludeParam}`)
      .then((r) => {
        if (!r.ok) throw new Error('Stream API failed');
        return r.json();
      })
      .then((d) => {
        if (d.videoId) {
          setVideoId(d.videoId);
        } else {
          throw new Error('No video found');
        }
      })
      .catch(() => {
        // Fallback to iTunes preview URL
        if (track?.preview_url) {
          console.log(`[Player] Using iTunes preview for "${name}"`);
          setVideoId('itunes-preview');
        } else {
          console.warn(`[Player] No audio source for "${name}", skipping`);
          next();
        }
      });
  };

  // Reset and resolve video ID when track changes
  useEffect(() => {
    bannedIdsRef.current = [];
    if (!track) { setVideoId(null); return; }
    if (track.youtubeId) {
      setVideoId(track.youtubeId);
    } else {
      setVideoId(null);
      fetchVideoId(track.artists[0]?.name ?? '', track.name, [], track);
    }
  }, [track?.id, track?.youtubeId]);

  // Create the <audio> element once and wire up events
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => { if (isFinite(audio.duration)) setDuration(audio.duration); };
    const onEnded = () => next();
    const onError = () => {
      const vid = videoIdRef.current;
      const { track: t } = getStoreState();
      const audio = audioRef.current;

      // Retry the same URL up to 4 times before banning the video ID.
      // Each retry is a new HTTP request → new Cloudflare Worker invocation → potentially different egress IP.
      if (vid && vid !== 'itunes-preview' && audioRetryRef.current < 4) {
        audioRetryRef.current += 1;
        console.log(`[Player] Audio error for ${vid}, retry ${audioRetryRef.current}/4…`);
        setTimeout(() => {
          if (audio && videoIdRef.current === vid) {
            audio.src = `/api/audio?videoId=${vid}&_r=${audioRetryRef.current}`;
            audio.load();
            const { isPlaying } = getStoreState();
            if (isPlaying) audio.play().catch(() => {});
          }
        }, 800);
        return;
      }

      // All retries exhausted — try a different YouTube video for this track
      audioRetryRef.current = 0;
      if (t && !t.youtubeId && vid) {
        console.log(`[Player] All retries failed for ${vid}, trying another video…`);
        bannedIdsRef.current = [...bannedIdsRef.current, vid];
        fetchVideoId(t.artists[0]?.name ?? '', t.name, bannedIdsRef.current);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load audio when videoId changes
  useEffect(() => {
    videoIdRef.current = videoId;
    audioRetryRef.current = 0;
    const audio = audioRef.current;
    if (!audio) return;
    if (!videoId) { audio.pause(); audio.src = ''; return; }

    if (videoId === 'itunes-preview' && track?.preview_url) {
      console.log(`[Player] Loading iTunes preview for "${track.name}"`);
      audio.src = track.preview_url;
    } else {
      console.log(`[Player] Loading YouTube audio for videoId: ${videoId}`);
      audio.src = `/api/audio?videoId=${videoId}`;
    }
    
    audio.load();
    const { isPlaying } = getStoreState();
    if (isPlaying) audio.play().catch(() => {});
  }, [videoId, track?.preview_url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play / pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Media Session API — OS media controls (lock screen, notification bar)
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
      audioRef.current?.play();
      usePlayerStore.setState({ isPlaying: true }); // eslint-disable-line
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
      usePlayerStore.setState({ isPlaying: false }); // eslint-disable-line
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (d.seekTime != null && audioRef.current) {
        audioRef.current.currentTime = d.seekTime;
        setCurrentTime(d.seekTime);
      }
    });
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Silent AudioContext oscillator — belt-and-suspenders alongside the real <audio> element
  useEffect(() => {
    const setup = () => {
      if (audioCtxRef.current) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      audioCtxRef.current = ctx;
      ctx.onstatechange = () => { if (ctx.state === 'suspended') ctx.resume(); };
    };
    document.addEventListener('click', setup, { once: true });
    return () => document.removeEventListener('click', setup);
  }, []);

  if (!track) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed z-40 bg-[var(--surface)] border-t border-[var(--border)] shadow-lg"
      style={{ left: "var(--sidebar-w)", right: "var(--rightpanel-w)", bottom: "var(--bottomnav-h)" }}
    >
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

        {/* Controls */}
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
