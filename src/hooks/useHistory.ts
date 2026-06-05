import { useState, useCallback, useEffect } from 'react';
import type { Track } from '../context/AudioContext';

const STORAGE_KEY = 'metrolist_history';
const MAX = 30;

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

export function useHistory() {
  const [history, setHistory] = useState<Track[]>(load);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHistory(load());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const push = useCallback((track: Track) => {
    setHistory((prev) => {
      const deduped = prev.filter((t) => t.id !== track.id);
      const next = [track, ...deduped].slice(0, MAX);
      save(next);
      return next;
    });
  }, []);

  return { history, push };
}
