'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePlayerStore } from '@/store/playerStore';

export default function SpotifyTokenCapture() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setSpotifyToken = usePlayerStore((s) => s.setSpotifyToken);
  const setSpotifyRefreshToken = usePlayerStore((s) => s.setSpotifyRefreshToken);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const token = searchParams.get('spotify_access_token');
    const refreshToken = searchParams.get('spotify_refresh_token');
    if (token) {
      setSpotifyToken(token);
      if (refreshToken) {
        setSpotifyRefreshToken(refreshToken);
      }
      router.replace('/liked');
    }
  }, [isMounted, searchParams, router, setSpotifyToken, setSpotifyRefreshToken]);

  if (!isMounted) return null;

  return null;
}
