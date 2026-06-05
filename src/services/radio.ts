/**
 * Radio Browser API wrapper — https://www.radio-browser.info
 * Free, open, no key required. Thousands of ad-free stations.
 */

export interface RadioStation {
  stationuuid: string;
  name: string;
  url_resolved: string;  // direct playable stream URL
  favicon: string;
  country: string;
  countrycode: string;
  language: string;
  tags: string;          // comma-separated genre tags
  codec: string;         // MP3, AAC, OGG, etc.
  bitrate: number;       // kbps
  votes: number;
}

// Multiple API mirrors for resilience
const API_HOSTS = [
  'https://de1.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
];

async function apiFetch(path: string): Promise<Response> {
  let lastErr: unknown;
  for (const host of API_HOSTS) {
    try {
      const r = await fetch(`${host}${path}`, {
        headers: { 'User-Agent': 'MetrolistDesktop/1.0', Accept: 'application/json' },
      });
      if (r.ok) return r;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('All radio-browser.info endpoints unreachable');
}

function clean(stations: RadioStation[]): RadioStation[] {
  const seen = new Set<string>();
  return stations
    .filter(s => s.url_resolved && s.bitrate >= 64 && !s.url_resolved.endsWith('.m3u'))
    .filter(s => {
      // Dedupe by normalized station name so repeated relays don't crowd the list
      const key = s.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Top-voted stations globally */
export async function fetchTopStations(limit = 120): Promise<RadioStation[]> {
  const r = await apiFetch(
    `/json/stations/topvote/${limit}?hidebroken=true`
  );
  return clean(await r.json());
}

/** Stations filtered by genre tag */
export async function fetchStationsByTag(tag: string, limit = 120): Promise<RadioStation[]> {
  const params = new URLSearchParams({
    tag,
    limit: String(limit),
    order: 'votes',
    reverse: 'true',
    hidebroken: 'true',
  });
  const r = await apiFetch(`/json/stations/search?${params}`);
  return clean(await r.json());
}

/** Text search by station name */
export async function searchStations(query: string, limit = 100): Promise<RadioStation[]> {
  const params = new URLSearchParams({
    name: query,
    limit: String(limit),
    order: 'votes',
    reverse: 'true',
    hidebroken: 'true',
  });
  const r = await apiFetch(`/json/stations/search?${params}`);
  return clean(await r.json());
}

/** Report a station click to radio-browser.info (helps their stats) */
export async function reportClick(stationuuid: string): Promise<void> {
  apiFetch(`/json/url/${stationuuid}`).catch(() => {});
}
