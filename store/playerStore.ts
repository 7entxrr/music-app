"use client";

import { create } from "zustand";
import type { EnrichedTrack, PlayerState } from "@/lib/types";

export const usePlayerStore = create<PlayerState>((set, get) => ({
  track: null,
  queue: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  spotifyToken: typeof window !== 'undefined' ? localStorage.getItem('spotify_token') : null,

  setSpotifyToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('spotify_token', token);
      else localStorage.removeItem('spotify_token');
    }
    set({ spotifyToken: token });
  },
  setTrack: (track) => set({ track, isPlaying: true, currentTime: 0 }),
  setQueue: (queue) => set({ queue }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),

  next: () => {
    const { track, queue } = get();
    if (!track || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === track.id);
    const next = queue[idx + 1];
    if (next) set({ track: next, isPlaying: true, currentTime: 0 });
  },

  prev: () => {
    const { track, queue, currentTime } = get();
    if (!track) return;
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    const idx = queue.findIndex((t) => t.id === track.id);
    const prev = queue[idx - 1];
    if (prev) set({ track: prev, isPlaying: true, currentTime: 0 });
  },
}));
