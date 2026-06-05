import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import type { SourceTrack } from './playlistImport';

/**
 * Reads a PUBLIC Spotify playlist/album by scraping its embed page.
 * No API key, no client secret, no login — uses the open.spotify.com/embed
 * page whose __NEXT_DATA__ JSON contains the track list (title + artist).
 * Fetched through Tauri's native HTTP so CORS doesn't block it.
 *
 * Limitations: only public playlists; the embed returns roughly the first
 * ~100 tracks. For private or very large playlists, use the CSV import.
 */

function extractSpotifyRef(input: string): { type: 'playlist' | 'album'; id: string } | null {
  const s = input.trim();
  let m = s.match(/spotify:(playlist|album):([a-zA-Z0-9]+)/);
  if (m) return { type: m[1] as 'playlist' | 'album', id: m[2] };
  m = s.match(/open\.spotify\.com\/(?:[a-z-]+\/)?(playlist|album)\/([a-zA-Z0-9]+)/);
  if (m) return { type: m[1] as 'playlist' | 'album', id: m[2] };
  return null;
}

// Recursively find the first non-empty `trackList` array in the embed JSON.
function findTrackList(obj: any): any[] | null {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray((obj as any).trackList) && (obj as any).trackList.length) return (obj as any).trackList;
  for (const k of Object.keys(obj)) {
    const r = findTrackList((obj as any)[k]);
    if (r) return r;
  }
  return null;
}

export async function getSpotifyTracks(input: string): Promise<{ name: string; tracks: SourceTrack[] }> {
  const ref = extractSpotifyRef(input);
  if (!ref) throw new Error('Not a Spotify playlist or album link.');

  const url = `https://open.spotify.com/embed/${ref.type}/${ref.id}`;
  const res = await tauriFetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'en' },
  } as any);
  if (!res.ok) throw new Error(`Spotify returned HTTP ${res.status}`);

  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Could not read Spotify page data (it may be private).');

  let data: any;
  try { data = JSON.parse(m[1]); } catch { throw new Error('Could not parse Spotify data.'); }

  const entity = data?.props?.pageProps?.state?.data?.entity;
  const name: string = entity?.name ?? entity?.title ?? 'Spotify Import';
  const list = findTrackList(data) ?? [];

  const tracks: SourceTrack[] = [];
  for (const t of list) {
    const title: string = t?.title ?? t?.name ?? '';
    // embed uses `subtitle` for the artist line; sometimes an artists[] array
    const artist: string =
      t?.subtitle ??
      (Array.isArray(t?.artists) ? t.artists.map((a: any) => a?.name).filter(Boolean).join(', ') : '') ??
      '';
    if (title) tracks.push({ title: title.trim(), artist: (artist || '').split(',')[0].trim() });
  }

  if (tracks.length === 0) throw new Error('No tracks found — the playlist may be private or empty.');
  return { name, tracks };
}
