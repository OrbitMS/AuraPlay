import type { SearchResult } from '../services/youtube';

const norm = (s: string) =>
  s.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

export interface RankFields {
  id: string;
  title: string;
  artist: string;
  views?: number;
  duration?: number;
  itemType?: string;
}

/**
 * Generic blended ranker: relevance + personal (liked/recently-played) +
 * popularity + format, with YouTube/source order as a gentle tie-breaker.
 */
export function rankItems<T>(
  items: T[],
  get: (item: T) => RankFields,
  query: string,
  likedIds: Set<string>,
  history: string[],
): T[] {
  const q = norm(query);
  const qTokens = q.split(' ').filter(Boolean);
  const qWantsLive = /\blive\b/.test(q);
  const qWantsRemix = /\b(remix|mix)\b/.test(q);

  const historyRank = new Map<string, number>();
  history.forEach((id, i) => { if (!historyRank.has(id)) historyRank.set(id, i); });

  const score = (f: RankFields, index: number): number => {
    const title = norm(f.title);
    const artist = norm(f.artist || '');
    let s = 0;

    // Relevance
    if (q && title === q) s += 6;
    else if (q && title.startsWith(q)) s += 4;
    else if (q && title.includes(q)) s += 3;
    else if (qTokens.length) {
      const hay = `${title} ${artist}`;
      const hit = qTokens.filter(t => hay.includes(t)).length;
      s += (hit / qTokens.length) * 2.5;
    }
    if (artist && q.includes(artist)) s += 1;

    // Personal
    if (likedIds.has(f.id)) s += 2.5;
    const hr = historyRank.get(f.id);
    if (hr !== undefined) s += 2 * Math.exp(-hr / 8);

    // Popularity
    if (f.views && f.views > 0) s += Math.min(2, Math.log10(f.views) / 4);

    // Format preference
    if (f.itemType?.includes('song') || (f.artist && f.itemType !== 'video')) s += 1;

    // Demotions
    if (f.duration && f.duration > 900 && qTokens.length <= 4) s -= 1.5;
    if (!qWantsLive && /\blive\b/.test(title)) s -= 0.6;
    if (!qWantsRemix && /\b(remix|sped up|slowed)\b/.test(title)) s -= 0.4;

    s -= index * 0.01;
    return s;
  };

  return items
    .map((item, i) => ({ item, s: score(get(item), i), i }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map(x => x.item);
}

/** Convenience wrapper for YouTube SearchResult[]. */
export function rankSearchResults(
  results: SearchResult[],
  query: string,
  likedIds: Set<string>,
  history: string[],
): SearchResult[] {
  return rankItems(
    results,
    r => ({ id: r.id, title: r.name, artist: r.artists?.[0]?.name ?? '', views: r.views, duration: r.duration, itemType: r.itemType }),
    query, likedIds, history,
  );
}
