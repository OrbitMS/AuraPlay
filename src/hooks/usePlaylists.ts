import { useReducer, useEffect } from 'react';
import type { Track } from '../context/AudioContext';

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

const KEY = 'auraplay_playlists';

function load(): Playlist[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

// Single shared store so the sidebar, views, and pickers all stay in sync.
let store: Playlist[] = load();
const subs = new Set<() => void>();

function commit(next: Playlist[]) {
  store = next;
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
  subs.forEach(fn => fn());
}

const uid = () => `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function createPlaylist(name: string, tracks: Track[] = []): string {
  const id = uid();
  commit([...store, { id, name: name.trim() || 'New Playlist', tracks, createdAt: Date.now() }]);
  return id;
}

export function renamePlaylist(id: string, name: string) {
  commit(store.map(p => (p.id === id ? { ...p, name: name.trim() || p.name } : p)));
}

export function deletePlaylist(id: string) {
  commit(store.filter(p => p.id !== id));
}

export function addTracksToPlaylist(id: string, tracks: Track[]) {
  commit(store.map(p => {
    if (p.id !== id) return p;
    const have = new Set(p.tracks.map(t => t.id));
    const merged = [...p.tracks, ...tracks.filter(t => t.id && !have.has(t.id))];
    return { ...p, tracks: merged };
  }));
}

export function removeTrackFromPlaylist(id: string, trackId: string) {
  commit(store.map(p => (p.id === id ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId) } : p)));
}

/** Subscribe to the shared playlist store. */
export function usePlaylists() {
  const [, force] = useReducer(x => x + 1, 0);
  useEffect(() => {
    subs.add(force);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) { store = load(); force(); } };
    window.addEventListener('storage', onStorage);
    return () => { subs.delete(force); window.removeEventListener('storage', onStorage); };
  }, []);
  return {
    playlists: store,
    createPlaylist, renamePlaylist, deletePlaylist,
    addTracksToPlaylist, removeTrackFromPlaylist,
  };
}
