import { useReducer, useEffect } from 'react';
import type { Track } from '../context/AudioContext';

export interface TrackStat {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  count: number;
  last: number;
}
interface StatsData {
  total: number;          // total plays
  since: number;          // first-ever play timestamp
  tracks: Record<string, TrackStat>;
}

const KEY = 'auraplay_stats';

function load(): StatsData {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '');
    if (v && typeof v.total === 'number' && v.tracks) return v;
  } catch {}
  return { total: 0, since: 0, tracks: {} };
}

let store: StatsData = load();
const subs = new Set<() => void>();
function commit() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
  subs.forEach(fn => fn());
}

/** Records one play. Called when a NEW track starts (not on resume). */
export function recordPlay(track: Track) {
  if (!track?.id) return;
  store.total += 1;
  if (!store.since) store.since = Date.now();
  const t = store.tracks[track.id];
  if (t) {
    t.count += 1;
    t.last = Date.now();
    if (track.title) t.title = track.title;
    if (track.artist) t.artist = track.artist;
    if (track.thumbnail) t.thumbnail = track.thumbnail;
  } else {
    store.tracks[track.id] = {
      id: track.id, title: track.title, artist: track.artist,
      thumbnail: track.thumbnail, count: 1, last: Date.now(),
    };
  }
  commit();
}

export function clearStats() { store = { total: 0, since: 0, tracks: {} }; commit(); }

export function topTracks(n = 20): TrackStat[] {
  return Object.values(store.tracks).sort((a, b) => b.count - a.count || b.last - a.last).slice(0, n);
}

export function topArtists(n = 12): { name: string; count: number; thumbnail: string }[] {
  const map = new Map<string, { name: string; count: number; thumbnail: string }>();
  for (const t of Object.values(store.tracks)) {
    const name = t.artist || 'Unknown Artist';
    const e = map.get(name) ?? { name, count: 0, thumbnail: t.thumbnail };
    e.count += t.count;
    if (!e.thumbnail && t.thumbnail) e.thumbnail = t.thumbnail;
    map.set(name, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, n);
}

export function statsSummary() {
  return {
    total: store.total,
    uniqueTracks: Object.keys(store.tracks).length,
    since: store.since,
    topArtist: topArtists(1)[0]?.name ?? null,
  };
}

export function useStats() {
  const [, force] = useReducer(x => x + 1, 0);
  useEffect(() => {
    subs.add(force);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) { store = load(); force(); } };
    window.addEventListener('storage', onStorage);
    return () => { subs.delete(force); window.removeEventListener('storage', onStorage); };
  }, []);
  return { summary: statsSummary(), topTracks, topArtists, clearStats };
}
