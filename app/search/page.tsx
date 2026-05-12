"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TrackCard from "@/components/TrackCard";
import Link from "next/link";
import type { EnrichedTrack } from "@/lib/types";
import Image from "next/image";
import SearchBar from "@/components/SearchBar";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<{ tracks: EnrichedTrack[]; artists: any[]; albums: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();

    const fetchResults = async () => {
      try {
        console.log("[Search] Fetching query:", query);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        console.log("[Search] Response status:", res.status, res.statusText);

        if (!res.ok) {
          const body = await res.text();
          console.error("[Search] Error body:", body);
          throw new Error(`Search failed: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        console.log("[Search] Full response:", JSON.stringify(data, null, 2));
        console.log("[Search] Tracks:", data?.tracks?.length ?? 0);
        console.log("[Search] Artists:", data?.artists?.length ?? 0);
        console.log("[Search] Albums:", data?.albums?.length ?? 0);
        setResults(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("[Search] Error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
    return () => controller.abort();
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SearchBar initialQuery={query} />

      {loading && <p className="mt-6 text-[var(--muted)]">Searching…</p>}

      {error && (
        <p className="mt-6 text-red-400 text-center py-4">{error}</p>
      )}

      {results && !loading && (
        <div className="mt-8 space-y-10">
          {results.artists && results.artists.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.artists.map((a) => (
                  <Link
                    key={a.id}
                    href={`/artist/${a.id}`}
                    className="group flex flex-col items-center p-4 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[var(--surface-2)] flex items-center justify-center">
                      {a.artworkUrl ? (
                        <Image src={a.artworkUrl} alt={a.name} fill className="object-cover" sizes="96px" />
                      ) : (
                        <span className="text-2xl font-bold text-white">{a.name?.[0] ?? "?"}</span>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium text-center truncate w-full">{a.name}</p>
                    <p className="text-xs text-[var(--muted)] capitalize">{a.genre || "Artist"}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.tracks && results.tracks.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Songs</h2>
              <div className="divide-y divide-[var(--border)]">
                {results.tracks.map((t) => (
                  <TrackCard key={t.id} track={t} queue={results.tracks} />
                ))}
              </div>
            </section>
          )}

          {results.albums && results.albums.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.albums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/album/${album.id}`}
                    className="group flex flex-col gap-2 p-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {album.artworkUrl ? (
                      <Image
                        src={album.artworkUrl}
                        alt={album.name}
                        width={200}
                        height={200}
                        className="rounded-lg w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-lg bg-[var(--surface-2)]" />
                    )}
                    <p className="text-sm font-medium truncate">{album.name}</p>
                    <p className="text-xs text-[var(--muted)] truncate">
                      {album.artists?.map((a: any) => a.name).join(", ")}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.tracks?.length === 0 &&
            results.artists?.length === 0 &&
            results.albums?.length === 0 && (
              <p className="text-[var(--muted)] text-center py-20">
                No results for &quot;{query}&quot;
              </p>
            )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8"><SearchBar /></div>}>
      <SearchResults />
    </Suspense>
  );
}
