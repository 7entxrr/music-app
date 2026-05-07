'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePlayerStore } from '@/store/playerStore';

export default function SpotifyTokenCapture() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setSpotifyToken = usePlayerStore((s) => s.setSpotifyToken);

  useEffect(() => {
    const token = searchParams.get('spotify_access_token');
    if (token) {
      setSpotifyToken(token);
      router.replace('/liked');
    }
  }, []);

  return null;
}
