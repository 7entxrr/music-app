'use client';

import { useSearchParams } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SpotifyErrorDisplay() {
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const error = searchParams.get('spotify_error');
  const errorDetails = searchParams.get('error_details');

  if (!error || !isVisible) return null;

  const errorMessages: Record<string, string> = {
    'auth_failed': 'Spotify authentication failed. Please try again.',
    'no_code': 'No authorization code received from Spotify.',
    'token_exchange_failed': 'Failed to exchange authorization code for access token.',
  };

  const message = errorMessages[error] || `Authentication error: ${error}`;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-2">
      <div className="bg-red-900/90 border border-red-700 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-200">{message}</p>
          {errorDetails && (
            <p className="text-xs text-red-300 mt-1 truncate">Details: {errorDetails}</p>
          )}
          <p className="text-xs text-red-400 mt-2">
            Make sure your Spotify Client ID and Secret are correctly configured in environment variables.
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 text-red-400 hover:text-red-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
