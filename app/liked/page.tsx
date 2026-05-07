'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Heart, Play, Pause, Music2 } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import type { SpotifyTrack } from '@/lib/types';
import type { EnrichedTrack } from '@/lib/types';
import Link from 'next/link';

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function spotifyToEnriched(t: SpotifyTrack): EnrichedTrack {
  return {
    id: t.id,
    name: t.name,
    artists: t.artists,
    album: {
      id: t.album.id,
      name: t.album.name,
      images: t.album.images.map((i) => ({ url: i.url })),
      release_date: t.album.release_date,
      artists: t.artists,
    },
    duration_ms: t.duration_ms,
    preview_url: t.preview_url,
    artworkUrl: t.album.images[0]?.url ?? '',
  };
}

export default function LikedPage() {
  const { spotifyToken, track: currentTrack, isPlaying, setTrack, setQueue, toggle } = usePlayerStore();
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spotifyToken) return;
    setLoading(true);
    fetch(`/api/spotify/library?access_token=${spotifyToken}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTracks(data.savedTracks ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [spotifyToken]);

  const handlePlay = (track: SpotifyTrack) => {
    const enriched = spotifyToEnriched(track);
    if (currentTrack?.id === track.id) {
      toggle();
    } else {
      setQueue(tracks.map(spotifyToEnriched));
      setTrack(enriched);
    }
  };

  if (!spotifyToken) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Heart className="w-12 h-12 text-[var(--muted)]" />
        <p className="text-[var(--foreground)] font-semibold text-lg">Connect Spotify to see your liked songs</p>
        <Link href="/" className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity">
          Go to Home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <p className="text-red-400 font-medium">Failed to load: {error}</p>
        <Link href="/" className="text-[var(--accent)] text-sm underline">Reconnect Spotify</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
          <Heart className="w-5 h-5 text-white" fill="white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Liked Songs</h1>
          <p className="text-sm text-[var(--muted)]">{tracks.length} songs</p>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-[var(--muted)]">
          <Music2 className="w-8 h-8" />
          <p className="text-sm">No liked songs found</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {tracks.map((track, i) => {
            const isActive = currentTrack?.id === track.id;
            const artwork = track.album.images[0]?.url;
            return (
              <li
                key={track.id}
                onClick={() => handlePlay(track)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  isActive ? 'bg-[var(--accent-light)]' : 'hover:bg-[var(--surface-2)]'
                }`}
              >
                <div className="w-5 flex-shrink-0 flex items-center justify-center">
                  <span className={`text-xs font-medium ${isActive ? 'hidden' : 'block group-hover:hidden'} text-[var(--muted)]`}>
                    {i + 1}
                  </span>
                  <span className={`${isActive ? 'flex' : 'hidden group-hover:flex'} items-center justify-center`}>
                    {isActive && isPlaying
                      ? <Pause className="w-3.5 h-3.5 text-[var(--accent)]" fill="currentColor" />
                      : <Play className="w-3.5 h-3.5 text-[var(--accent)]" fill="currentColor" />}
                  </span>
                </div>

                <div className="relative w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden">
                  {artwork ? (
                    <Image src={artwork} alt={track.name} fill className="object-cover" sizes="36px" />
                  ) : (
                    <div className="w-full h-full bg-[var(--surface-3)]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${isActive ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}`}>
                    {track.name}
                  </p>
                  <p className="text-xs text-[var(--muted)] truncate">
                    {track.artists.map((a) => a.name).join(', ')}
                  </p>
                </div>

                <p className="text-xs text-[var(--muted)] truncate hidden sm:block max-w-[140px]">
                  {track.album.name}
                </p>

                <span className="text-xs text-[var(--muted)] flex-shrink-0 w-8 text-right tabular-nums">
                  {fmtMs(track.duration_ms)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
