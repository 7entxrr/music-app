'use client';

import { Music } from 'lucide-react';

export default function SpotifyButton() {
  const handleSpotifyLogin = async () => {
    try {
      const response = await fetch('/api/spotify/login');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error initiating Spotify login:', error);
    }
  };

  return (
    <button
      onClick={handleSpotifyLogin}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full font-semibold shadow-md transition-all duration-200 hover:shadow-lg"
    >
      <Music className="w-5 h-5" />
      Fetch Spotify Music & Albums
    </button>
  );
}
