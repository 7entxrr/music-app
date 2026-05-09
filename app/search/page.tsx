"use client";

import { useState, useEffect, useRef } from "react";
import TrackCard from "@/components/TrackCard";
import Link from "next/link";
import type { EnrichedTrack } from "@/lib/types";
import Image from "next/image";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ tracks: EnrichedTrack[]; artists: any[]; albums: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs, artists, albums…"
        className="w-full rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] px-5 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors mb-6"
        autoFocus
      />

      {loading && <p className="text-[var(--muted)]">Searching…</p>}

      {results && (
        <div className="space-y-10">
          {results.artists.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.artists.map((a) => (
                  <Link key={a.id} href={`/artist/${a.id}`} className="group flex flex-col items-center p-4 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[var(--surface-2)] flex items-center justify-center text-2xl font-bold text-[var(--muted)]">
                      {a.artworkUrl ? (
                        <Image src={a.artworkUrl} alt={a.name} fill className="object-cover" sizes="96px" />
                      ) : (
                        a.name[0]
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium text-center truncate w-full">{a.name}</p>
                    <p className="text-xs text-[var(--muted)] capitalize">{a.genre || "Artist"}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.tracks.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Songs</h2>
              <div className="divide-y divide-[var(--border)]">
                {results.tracks.map((t) => (
                  <TrackCard key={t.id} track={t} queue={results.tracks} />
                ))}
              </div>
            </section>
          )}

          {results.albums.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.albums.map((album) => (
                  <Link key={album.id} href={`/album/${album.id}`} className="group flex flex-col gap-2 p-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors">
                    {album.artworkUrl ? (
                      <Image src={album.artworkUrl} alt={album.name} width={200} height={200} className="rounded-lg w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square rounded-lg bg-[var(--surface-2)]" />
                    )}
                    <p className="text-sm font-medium truncate">{album.name}</p>
                    <p className="text-xs text-[var(--muted)] truncate">
                      {album.artists.map((a: any) => a.name).join(", ")}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.tracks.length === 0 && results.artists.length === 0 && results.albums.length === 0 && !loading && (
            <p className="text-[var(--muted)] text-center py-20">No results for &quot;{query}&quot;</p>
          )}
        </div>
      )}
    </div>
  );
}
