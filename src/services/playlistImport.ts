import { matchTrack } from './youtube';
import type { Track } from '../context/AudioContext';

export interface SourceTrack { title: string; artist: string; }
export interface MatchRow {
  source: SourceTrack;
  match: Track | null;
  confidence: 'high' | 'low' | 'none';
  selected: boolean;
}

/* ── Parsing ──────────────────────────────────────────────────────────────── */

// Minimal CSV line splitter that respects double-quoted fields.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/**
 * Parses pasted text or a CSV file into source tracks.
 * Supports:
 *  - Exportify / generic CSV with a header (detects Track/Title + Artist columns)
 *  - Plain lines: "Artist - Title" (or just "Title")
 */
export function parseSourceList(text: string): SourceTrack[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const looksCsv = header.includes(',') && /track|title|artist|name/.test(header);

  if (looksCsv) {
    const cols = splitCsvLine(lines[0]).map(c => c.toLowerCase());
    const findCol = (...names: string[]) => cols.findIndex(c => names.some(n => c.includes(n)));
    const titleIdx = findCol('track name', 'track', 'title', 'song', 'name');
    const artistIdx = findCol('artist name', 'artist', 'artists');
    const out: SourceTrack[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = splitCsvLine(lines[i]);
      const title = (titleIdx >= 0 ? cells[titleIdx] : cells[0]) ?? '';
      const artist = (artistIdx >= 0 ? cells[artistIdx] : cells[1]) ?? '';
      // Exportify lists multiple artists comma-separated inside one quoted cell → take the first
      const firstArtist = artist.split(',')[0].trim();
      if (title) out.push({ title: title.trim(), artist: firstArtist });
    }
    if (out.length) return out;
  }

  // Freeform: "Artist - Title" per line
  return lines.map(line => {
    const parts = line.split(/\s[-–—]\s/);
    if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
    return { artist: '', title: line };
  });
}

/* ── Matching ─────────────────────────────────────────────────────────────── */

// Resolves all source tracks to YouTube matches, throttled to avoid rate limits.
export async function matchSources(
  sources: SourceTrack[],
  onProgress?: (done: number, total: number) => void,
): Promise<MatchRow[]> {
  const results: MatchRow[] = new Array(sources.length);
  const CONCURRENCY = 3;
  let done = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < sources.length) {
      const i = cursor++;
      const src = sources[i];
      let row: MatchRow;
      try {
        const m = await matchTrack(src.title, src.artist);
        row = m
          ? { source: src, match: { id: m.id, title: m.title, artist: m.artist, thumbnail: m.thumbnail }, confidence: m.confidence, selected: true }
          : { source: src, match: null, confidence: 'none', selected: false };
      } catch {
        row = { source: src, match: null, confidence: 'none', selected: false };
      }
      results[i] = row;
      done++;
      onProgress?.(done, sources.length);
      // gentle spacing between requests
      await new Promise(r => setTimeout(r, 120));
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, sources.length) }, worker));
  return results;
}
