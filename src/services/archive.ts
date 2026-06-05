import type { Track } from '../context/AudioContext';

/**
 * Internet Archive (archive.org) audio. Free, no API key. Search returns items
 * (concerts, albums, collections); each item's metadata yields direct MP3/OGG
 * file URLs that play through the normal track pipeline (Track.url).
 * JSON endpoints send permissive CORS; media plays via <audio> directly.
 */

export interface ArchiveItem {
  identifier: string;
  title: string;
  creator: string;
  thumbnail: string;
}

function firstStr(v: unknown): string {
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  return typeof v === 'string' ? v : '';
}

export async function searchArchive(query: string, rows = 48): Promise<ArchiveItem[]> {
  const params = new URLSearchParams();
  params.set('q', `(${query}) AND mediatype:(audio)`);
  ['identifier', 'title', 'creator'].forEach(f => params.append('fl[]', f));
  params.append('sort[]', 'downloads desc');
  params.set('rows', String(rows));
  params.set('page', '1');
  params.set('output', 'json');

  const r = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`);
  if (!r.ok) throw new Error(`Archive search failed (${r.status})`);
  const j = await r.json();
  return (j.response?.docs ?? []).map((d: any) => ({
    identifier: d.identifier,
    title: firstStr(d.title) || d.identifier,
    creator: firstStr(d.creator),
    thumbnail: `https://archive.org/services/img/${d.identifier}`,
  }));
}

const AUDIO_RE = /\.(mp3|ogg|oga|flac|m4a)$/i;

/** Resolves an item's playable audio tracks (prefers MP3 for webview compatibility). */
export async function getArchiveItemTracks(identifier: string): Promise<Track[]> {
  const r = await fetch(`https://archive.org/metadata/${identifier}`);
  if (!r.ok) throw new Error(`Archive item failed (${r.status})`);
  const j = await r.json();
  const files: any[] = j.files ?? [];
  const artist = firstStr(j.metadata?.creator);
  const thumbnail = `https://archive.org/services/img/${identifier}`;

  let audio = files.filter(f => f?.name && (AUDIO_RE.test(f.name) || /mp3|ogg|flac/i.test(f.format ?? '')));
  // Prefer MP3 to avoid one track appearing several times in different formats
  const mp3 = audio.filter(f => /mp3/i.test(f.format ?? '') || /\.mp3$/i.test(f.name));
  if (mp3.length) audio = mp3;

  return audio.map(f => ({
    id: `${identifier}/${f.name}`,
    title: (f.title || f.name).replace(/\.[^.]+$/, ''),
    artist: f.artist || artist,
    thumbnail,
    url: `https://archive.org/download/${identifier}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
  }));
}
