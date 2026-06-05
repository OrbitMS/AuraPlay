/**
 * Lyrics via LRCLIB (https://lrclib.net) — free, no key, CORS-enabled.
 * Returns time-synced lyrics when available, falling back to plain text.
 */

export interface SyncedLine { time: number; text: string; }
export interface LyricsResult {
  synced: SyncedLine[] | null;
  plain: string | null;
}

const memCache = new Map<string, LyricsResult>();

function cacheKey(title: string, artist: string) {
  return `${artist.toLowerCase().trim()}|${title.toLowerCase().trim()}`;
}

// Strip YouTube-style noise so the title matches LRCLIB's catalogue.
function cleanTitle(t: string): string {
  return t
    .replace(/\([^)]*\)/g, ' ')          // (Official Video), (Audio)…
    .replace(/\[[^\]]*\]/g, ' ')          // [Official], [4K]…
    .replace(/\b(official|video|audio|lyrics?|visualizer|mv|hd|hq|4k|remaster(?:ed)?|explicit)\b/gi, ' ')
    .replace(/\b(feat|ft)\.?\s.*$/i, ' ') // drop "feat. X"
    .replace(/[|｜].*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLRC(lrc: string): SyncedLine[] {
  const re = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const out: SyncedLine[] = [];
  for (const raw of lrc.split('\n')) {
    const stamps = [...raw.matchAll(re)];
    if (!stamps.length) continue;
    const text = raw.replace(re, '').trim();
    for (const m of stamps) {
      const min = +m[1];
      const sec = +m[2];
      const frac = m[3] ? parseFloat(`0.${m[3]}`) : 0;
      out.push({ time: min * 60 + sec + frac, text });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

interface LrclibRow { syncedLyrics?: string | null; plainLyrics?: string | null; }

async function lrclibGet(artist: string, track: string, duration?: number): Promise<LrclibRow | null> {
  const p = new URLSearchParams({ artist_name: artist, track_name: track });
  if (duration && duration > 0) p.set('duration', String(Math.round(duration)));
  const r = await fetch(`https://lrclib.net/api/get?${p.toString()}`);
  if (!r.ok) return null;
  return r.json();
}

async function lrclibSearch(q: string): Promise<LrclibRow | null> {
  const r = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) return null;
  const arr = await r.json();
  if (!Array.isArray(arr) || arr.length === 0) return null;
  // Prefer a result that actually has synced lyrics
  return arr.find((x: LrclibRow) => x.syncedLyrics) ?? arr[0];
}

export async function getLyrics(title: string, artist: string, duration?: number): Promise<LyricsResult> {
  const key = cacheKey(title, artist);
  if (memCache.has(key)) return memCache.get(key)!;

  // Persistent cache (lyrics never change)
  try {
    const raw = localStorage.getItem(`lyrics_${key}`);
    if (raw) { const v = JSON.parse(raw) as LyricsResult; memCache.set(key, v); return v; }
  } catch {}

  const cleanT = cleanTitle(title);
  const hasArtist = artist && artist !== 'Unknown Artist';
  let row: LrclibRow | null = null;
  try {
    if (hasArtist) row = await lrclibGet(artist, cleanT, duration);
    if (!row) row = await lrclibSearch([cleanT, hasArtist ? artist : ''].join(' ').trim());
  } catch { /* network/CORS — treated as "no lyrics" */ }

  const result: LyricsResult = {
    synced: row?.syncedLyrics ? parseLRC(row.syncedLyrics) : null,
    plain: row?.plainLyrics ?? null,
  };

  memCache.set(key, result);
  // Only persist successful hits to avoid caching transient failures forever
  if (result.synced || result.plain) {
    try { localStorage.setItem(`lyrics_${key}`, JSON.stringify(result)); } catch {}
  }
  return result;
}

/** Index of the active line for a given playback time (last line whose time ≤ t). */
export function activeLineIndex(lines: SyncedLine[], t: number): number {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return ans;
}
