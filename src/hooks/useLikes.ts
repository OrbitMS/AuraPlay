import { useState, useCallback, useEffect } from 'react';
import type { Track } from '../context/AudioContext';

const STORAGE_KEY = 'metrolist_liked_tracks';

function load(): Track[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(tracks: Track[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
}

export function useLikes() {
  const [liked, setLiked] = useState<Track[]>(load);

  // Sync across tabs / windows
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLiked(load());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const likedIds = new Set(liked.map((t) => t.id));

  const toggle = useCallback((track: Track) => {
    setLiked((prev) => {
      const next = prev.some((t) => t.id === track.id)
        ? prev.filter((t) => t.id !== track.id)
        : [...prev, track];
      save(next);
      return next;
    });
  }, []);

  const isLiked = useCallback((id: string) => likedIds.has(id), [likedIds]);

  return { liked, likedIds, toggle, isLiked };
}
