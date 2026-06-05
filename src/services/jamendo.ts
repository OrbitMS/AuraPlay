import type { Track } from '../context/AudioContext';

/**
 * Jamendo — ~600k Creative-Commons full tracks. Free API; requires a free
 * Client ID (register at devportal.jamendo.com). Returns direct MP3 stream
 * URLs that play through the normal pipeline (Track.url).
 */

const KEY = 'auraplay_jamendo_client';
export function getJamendoClientId(): string { return localStorage.getItem(KEY) ?? ''; }
export function setJamendoClientId(id: string) { localStorage.setItem(KEY, id.trim()); }

function mapTracks(results: any[]): Track[] {
  return (results ?? [])
    .filter(t => t?.audio)
    .map(t => ({
      id: `jam_${t.id}`,
      title: t.name ?? 'Unknown',
      artist: t.artist_name ?? '',
      thumbnail: t.album_image || t.image || '',
      url: t.audio as string,
    }));
}

async function call(params: Record<string, string>): Promise<Track[]> {
  const cid = getJamendoClientId();
  if (!cid) throw new Error('NO_CLIENT_ID');
  const p = new URLSearchParams({ client_id: cid, format: 'json', audioformat: 'mp32', ...params });
  const r = await fetch(`https://api.jamendo.com/v3.0/tracks/?${p.toString()}`);
  if (!r.ok) throw new Error(`Jamendo error ${r.status}`);
  const j = await r.json();
  return mapTracks(j.results);
}

export function searchJamendo(query: string, limit = 60): Promise<Track[]> {
  return call({ search: query, limit: String(limit) });
}

export function popularJamendo(limit = 60): Promise<Track[]> {
  return call({ order: 'popularity_month', limit: String(limit) });
}

export function jamendoByTag(tag: string, limit = 60): Promise<Track[]> {
  return call({ tags: tag, order: 'popularity_month', limit: String(limit) });
}
