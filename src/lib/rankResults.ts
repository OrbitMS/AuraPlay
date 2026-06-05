import type { SearchResult } from '../services/youtube';

/**
 * Re-ranks raw search results with a blended relevance + popularity + personal
 * score. YouTube's own order is a strong relevance baseline, so we keep it as a
 * tie-breaker and layer signals on top:
 *   • query match   — exact/prefix/token overlap on title (and artist)
 *   • personal      — songs you've LIKED or recently PLAYED rise to the top
 *   • popularity     — view count (when exposed) as a global signal
 *   • format         — prefer real "songs" over random "videos"
 *   • demotions      — hour-long mixes / "live"/"cover" when you didn't ask
 */
export function rankSearchResults(
  results: SearchResult[],
  query: string,
  likedIds: Set<string>,
  history: string[], // track ids, most-recent first
): SearchResult[] {
  const norm = (s: string) =>
    s.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  const q = norm(query);
  const qTokens = q.split(' ').filter(Boolean);
  const qWantsLive = /\blive\b/.test(q);
  const qWantsRemix = /\b(remix|mix)\b/.test(q);

  // history → recency rank (0 = most recent) for a decaying personal boost
  const historyRank = new Map<string, number>();
  history.forEach((id, i) => { if (!historyRank.has(id)) historyRank.set(id, i); });

  const score = (r: SearchResult, index: number): number => {
    const title = norm(r.name);
    const artist = norm(r.artists?.[0]?.name ?? '');
    let s = 0;

    // ── Query relevance ──
    if (title === q) s += 6;
    else if (title.startsWith(q)) s += 4;
    else if (q && title.includes(q)) s += 3;
    else if (qTokens.length) {
      const hay = `${title} ${artist}`;
      const hit = qTokens.filter(t => hay.includes(t)).length;
      s += (hit / qTokens.length) * 2.5;
    }
    if (artist && q.includes(artist)) s += 1; // query names the artist

    // ── Personal signals (the "most played / yours first" part) ──
    if (likedIds.has(r.id)) s += 2.5;
    const hr = historyRank.get(r.id);
    if (hr !== undefined) s += 2 * Math.exp(-hr / 8); // recent plays boosted most

    // ── Global popularity ──
    if (r.views && r.views > 0) s += Math.min(2, Math.log10(r.views) / 4);

    // ── Format preference ──
    if (r.itemType?.includes('song') || (r.artists?.[0]?.name && r.itemType !== 'video')) s += 1;

    // ── Demotions for likely-not-what-you-want ──
    if (r.duration && r.duration > 900 && qTokens.length <= 4) s -= 1.5; // long mixes
    if (!qWantsLive && /\blive\b/.test(title)) s -= 0.6;
    if (!qWantsRemix && /\b(remix|sped up|slowed)\b/.test(title)) s -= 0.4;

    // Preserve YouTube's order as a gentle tie-breaker
    s -= index * 0.01;
    return s;
  };

  return results
    .map((r, i) => ({ r, s: score(r, i), i }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map(x => x.r);
}
