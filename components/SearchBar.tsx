"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { EnrichedTrack } from "@/lib/types";

interface Suggestion {
  id: string;
  name: string;
  subtitle: string;
  artworkUrl: string;
  type: "track" | "artist";
}

export default function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&types=track,artist`);
      if (!res.ok) {
        throw new Error(`Search failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      console.log("[SearchBar] Suggestions response:", JSON.stringify(data, null, 2));
      const tracks: Suggestion[] = (Array.isArray(data.tracks) ? data.tracks : (data.tracks?.items ?? [])).slice(0, 4).map((t: EnrichedTrack) => ({
        id: t.id,
        name: t.name,
        subtitle: t.artists.map((a) => a.name).join(", "),
        artworkUrl: t.artworkUrl || t.album?.images?.[0]?.url || "",
        type: "track" as const,
      }));
      const artists: Suggestion[] = (Array.isArray(data.artists) ? data.artists : (data.artists?.items ?? [])).slice(0, 2).map((a: { id: string; name: string; genres: string[]; images: { url: string }[]; artworkUrl?: string }) => ({
        id: a.id,
        name: a.name,
        subtitle: a.genres?.[0] ?? "Artist",
        artworkUrl: a.artworkUrl ?? a.images?.[0]?.url ?? "",
        type: "artist" as const,
      }));
      setSuggestions([...tracks, ...artists]);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
      // Show error message to user
      if (typeof window !== 'undefined') {
        const errorMessage = error instanceof Error ? error.message : 'Search failed. Please try again.';
        // You can add a snackbar/toast notification here
        alert(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelect = (s: Suggestion) => {
    setOpen(false);
    setQuery("");
    if (s.type === "artist") router.push(`/artist/${s.id}`);
    else router.push(`/search?q=${encodeURIComponent(s.name)}`);
  };

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search songs, artists, albums…"
          className="w-full rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] px-5 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </form>

      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute top-full mt-2 w-full rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden z-50">
          {loading && (
            <div className="px-4 py-3 text-sm text-[var(--muted)]">Searching…</div>
          )}
          {suggestions.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => handleSelect(s)}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left"
            >
              {s.artworkUrl ? (
                <Image
                  src={s.artworkUrl}
                  alt={s.name}
                  width={36}
                  height={36}
                  className="rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded bg-[var(--surface-2)] flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-xs text-[var(--muted)] truncate">{s.subtitle}</p>
              </div>
              <span className="ml-auto text-xs text-[var(--muted)] capitalize">{s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
