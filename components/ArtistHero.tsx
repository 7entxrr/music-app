import Image from "next/image";
import type { ItunesArtist } from "@/lib/types";

interface Props {
  artist: ItunesArtist;
}

export default function ArtistHero({ artist }: Props) {
  return (
    <div className="relative w-full h-72 md:h-96 overflow-hidden rounded-2xl bg-[var(--surface)]">
      {artist.artworkUrl && (
        <Image
          src={artist.artworkUrl}
          alt={artist.name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 p-6">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Artist</p>
        <h1 className="text-4xl md:text-6xl font-bold">{artist.name}</h1>
        {artist.genre && (
          <p className="mt-2 text-sm text-[var(--muted)] capitalize">{artist.genre}</p>
        )}
      </div>
    </div>
  );
}
