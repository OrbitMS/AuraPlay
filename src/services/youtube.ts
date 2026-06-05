import { Innertube, UniversalCache, type Types } from 'youtubei.js';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { BG } from 'bgutils-js';

let yt: Innertube | null = null;
let streamYt: Innertube | null = null;

// Routes youtubei.js requests through Tauri's HTTP plugin and spoofs the
// YouTube Music web client so search and stream resolution behave like a browser.
const innertubeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const options = init ? { ...init } : {};
  const rawHeaders: Record<string, string> = {};

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => { rawHeaders[key] = value; });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => { rawHeaders[key] = value; });
    } else {
      Object.assign(rawHeaders, options.headers);
    }
  }

  rawHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  rawHeaders['Accept'] = '*/*';
  rawHeaders['Origin'] = 'https://music.youtube.com';
  rawHeaders['Referer'] = 'https://music.youtube.com/';

  options.headers = rawHeaders;
  return tauriFetch(input as string, options as any) as unknown as Response;
};

export async function getClient() {
  if (!yt) {
    yt = await Innertube.create({
      fetch: innertubeFetch,
      cache: new UniversalCache(true),
      generate_session_locally: true,
      retrieve_player: false
    });
  }
  return yt;
}

// Plain Tauri-routed fetch (no spoofed YouTube headers) for BotGuard's calls to
// Google's attestation endpoints, which are covered by the configured HTTP scope.
const plainTauriFetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  tauriFetch(input as string, init as any)) as typeof fetch;

// Generates a Proof-of-Origin (po) token via BotGuard. YouTube increasingly
// rejects stream requests from the web client without one ("Sign in to confirm
// you're not a bot"). BotGuard runs in this webview's real browser environment.
// Returns null if generation fails so callers can fall back to a plain client.
async function generatePoToken(visitorData: string): Promise<string | null> {
  try {
    const bgConfig = {
      fetch: plainTauriFetch,
      globalObj: window,
      identifier: visitorData,
      requestKey: 'O43z0dpjhgX20SCx4KAo',
    };
    const challenge = await BG.Challenge.create(bgConfig);
    if (!challenge) return null;

    const interpreter = challenge.interpreterJavascript.privateDoNotAccessOrElseSafeScriptWrappedValue;
    if (interpreter) {
      // eslint-disable-next-line no-new-func
      new Function(interpreter)();
    }

    const { poToken } = await BG.PoToken.generate({
      program: challenge.program,
      globalName: challenge.globalName,
      bgConfig,
    });
    return poToken ?? null;
  } catch (err) {
    console.warn('po_token generation failed; falling back to plain client:', err);
    return null;
  }
}

// Separate client used for playback. It retrieves the YouTube player (base.js),
// needed to decipher stream signatures and solve the `n` throttling param, and
// attaches a po_token so the web client returns streaming data. Search uses a
// different, lighter client (no player, no po_token).
// Promise-locked: concurrent callers share one initialization, preventing
// duplicate po_token generation and double client creation.
let streamYtInit: Promise<Innertube> | null = null;
async function getStreamClient(): Promise<Innertube> {
  if (streamYt) return streamYt;
  if (!streamYtInit) {
    streamYtInit = (async () => {
      // A throwaway client gives us the visitor_data that ties the po_token to this session.
      const seed = await Innertube.create({ fetch: innertubeFetch, retrieve_player: false });
      const visitorData = seed.session.context.client.visitorData ?? '';
      const poToken = visitorData ? await generatePoToken(visitorData) : null;
      console.log(`[stream] po_token: ${poToken ? `generated (${poToken.length} chars)` : 'NULL — BotGuard failed'}`);
      streamYt = await Innertube.create({
        fetch: innertubeFetch,
        cache: new UniversalCache(true),
        generate_session_locally: true,
        retrieve_player: true,
        ...(poToken ? { po_token: poToken, visitor_data: visitorData } : {}),
      });
      return streamYt;
    })();
  }
  return streamYtInit;
}

type FeedTrack = {
  id: string;           // videoId for songs, browseId for albums
  name: string;
  artists: { name: string }[];
  thumbnails: { url: string }[];
  itemType?: 'song' | 'video' | 'album'; // album cards need different click handling
};

// Fetches all playable tracks from a YouTube Music album by its browse ID.
export async function getAlbumTracks(browseId: string): Promise<
  { id: string; title: string; artist: string; thumbnail: string }[]
> {
  const client = await getClient();
  const album = await client.music.getAlbum(browseId);
  const results: { id: string; title: string; artist: string; thumbnail: string }[] = [];

  for (const item of (album.contents as any) ?? []) {
    const id: string = item.id ?? item.video_id ?? '';
    if (!id) continue;

    const title = typeof item.title === 'string' ? item.title : (item.title?.toString?.() ?? 'Unknown');
    const artist: string = item.artists?.[0]?.name ?? item.author ?? '';

    // Album tracks share the album thumbnail or have their own
    const thumbData = item.thumbnail?.contents ?? item.thumbnail?.thumbnails ?? [];
    const thumbArr: any[] = Array.isArray(thumbData) ? thumbData : [];
    const thumbnail = thumbArr[thumbArr.length - 1]?.url ?? thumbArr[0]?.url ?? '';

    results.push({ id, title, artist, thumbnail });
  }
  return results;
}

// Returns related tracks for auto-queue via YouTube Music's automix/radio feature.
export async function getRelatedTracks(videoId: string): Promise<
  { id: string; title: string; artist: string; thumbnail: string }[]
> {
  const client = await getClient();
  try {
    const panel = await client.music.getUpNext(videoId, true);
    const results: { id: string; title: string; artist: string; thumbnail: string }[] = [];

    for (const item of (panel as any).contents ?? []) {
      if (item.type !== 'PlaylistPanelVideo') continue;
      const id: string = item.video_id ?? '';
      if (!id || id === videoId) continue;

      const title = item.title?.toString?.() ?? 'Unknown';
      const artist: string =
        item.artists?.[0]?.name ?? (typeof item.author === 'string' ? item.author : '') ?? '';
      const thumbArr: any[] = Array.isArray(item.thumbnail) ? item.thumbnail : [];
      const thumbnail: string =
        thumbArr[thumbArr.length - 1]?.url ?? thumbArr[0]?.url ?? '';

      results.push({ id, title, artist, thumbnail });
    }
    return results;
  } catch (err) {
    console.warn('[autoqueue] getUpNext failed:', err);
    return [];
  }
}

/** Fetches the YouTube Music Explore page — contains New Releases, Charts, Moods etc. */
export async function getExploreSections(): Promise<{ title: string; tracks: FeedTrack[] }[]> {
  const client = await getClient();
  const explore = await client.music.getExplore();
  const sections: { title: string; tracks: FeedTrack[] }[] = [];

  for (const shelf of (explore as any).sections ?? []) {
    const rawTitle = (shelf as any).header?.title;
    const title: string =
      typeof rawTitle === 'string' ? rawTitle : rawTitle?.text ?? rawTitle?.runs?.[0]?.text ?? '';
    const items: any[] = (shelf as any).contents ?? [];
    const tracks: FeedTrack[] = [];
    for (const item of items) {
      const t = normalizeFeedItem(item);
      if (t) tracks.push(t);
    }
    if (tracks.length > 0) sections.push({ title, tracks });
    if (sections.length >= 3) break;
  }
  return sections;
}

export async function getHomeFeed(): Promise<{ title: string; tracks: FeedTrack[] }[]> {
  const client = await getClient();
  const feed = await client.music.getHomeFeed();
  const sections: { title: string; tracks: FeedTrack[] }[] = [];

  for (const shelf of feed.sections ?? []) {
    const rawTitle = (shelf as any).header?.title;
    const title: string =
      typeof rawTitle === 'string' ? rawTitle : rawTitle?.text ?? rawTitle?.runs?.[0]?.text ?? '';
    const items: any[] = (shelf as any).contents ?? [];
    const tracks: FeedTrack[] = [];
    for (const item of items) {
      const t = normalizeFeedItem(item);
      if (t) tracks.push(t);
    }
    if (tracks.length > 0) sections.push({ title, tracks });
    if (sections.length >= 4) break;
  }
  return sections;
}

// Normalises a MusicTwoRowItem from the home feed into a FeedTrack.
// Songs and videos get their videoId; albums get their browseId and itemType='album'.
// Playlists and artists are excluded (too broad to show as a card).
function normalizeFeedItem(item: any): FeedTrack | null {
  if (!item) return null;

  const type: string = item.item_type ?? '';

  // Handle albums — pass through with browseId so HomeContent can fetch their tracks
  if (type === 'album') {
    const browseId: string = item.endpoint?.payload?.browseId ?? item.id ?? '';
    if (!browseId) return null;

    let name = 'Unknown';
    if (typeof item.title === 'string') name = item.title;
    else if (item.title?.text) name = item.title.text;
    else if (item.title?.runs?.[0]?.text) name = item.title.runs[0].text;

    const artist: string = item.artists?.[0]?.name ?? item.author?.name ?? '';
    const thumb: any[] = Array.isArray(item.thumbnail) ? item.thumbnail : [];
    const thumbnailUrl = thumb[thumb.length - 1]?.url ?? thumb[0]?.url ?? item.thumbnails?.[0]?.url ?? '';

    return { id: browseId, name, artists: [{ name: artist }], thumbnails: [{ url: thumbnailUrl }], itemType: 'album' };
  }

  // Exclude playlists and artists
  if (type === 'playlist' || type === 'artist') return null;

  // Songs / videos — need a real 11-char videoId
  const videoId: string =
    item.endpoint?.payload?.videoId ??
    item.video_id ??
    item.videoId ??
    (typeof item.id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(item.id) ? item.id : null) ??
    '';
  if (!videoId) return null;

  let name = 'Unknown';
  if (typeof item.title === 'string') name = item.title;
  else if (item.title?.text) name = item.title.text;
  else if (item.title?.runs?.[0]?.text) name = item.title.runs[0].text;

  let artist = '';
  if (item.artists?.[0]?.name) artist = item.artists[0].name;
  else if (item.author?.name) artist = item.author.name;
  else if (typeof item.author === 'string') artist = item.author;
  else if (item.subtitle?.runs) {
    // subtitle runs for songs: "Song • Artist • Album"  — grab the artist run
    const runs: any[] = item.subtitle.runs ?? [];
    const artistRun = runs.find((r: any) =>
      r.endpoint?.payload?.browseId?.startsWith('UC') || // channel-linked artist
      (r.text && r.text !== ' • ' && !/^(Song|Video|\d{4})$/.test(r.text.trim()))
    );
    artist = artistRun?.text ?? '';
  }

  // MusicTwoRowItem.thumbnail is Thumbnail[] (parsed class array), not raw JSON
  const thumb: any[] = Array.isArray(item.thumbnail) ? item.thumbnail : [];
  // Thumbnail array is sorted large→small; last entry is usually smallest/squarish
  const thumbnailUrl: string =
    thumb[thumb.length - 1]?.url ?? thumb[0]?.url ??
    item.thumbnails?.[0]?.url ?? '';

  return {
    id: videoId,
    name,
    artists: [{ name: artist }],
    thumbnails: [{ url: thumbnailUrl }],
    itemType: (type === 'video' ? 'video' : 'song') as 'song' | 'video',
  };
}

export async function searchMusic(query: string) {
  const client = await getClient();
  console.log(`🔍 Sending search query to YouTube: "${query}"`);
  const results = await client.music.search(query);
  
  const rawItems: any[] = [];
  if (results.contents && Array.isArray(results.contents)) {
    results.contents.forEach((item: any) => {
      if (item?.type === 'ItemSection' && Array.isArray(item.contents)) {
        rawItems.push(...item.contents);
      } else if (item?.type === 'MusicCardShelf' && Array.isArray(item.contents)) {
        rawItems.push(...item.contents);
      } else if (item) {
        rawItems.push(item);
      }
    });
  }

  const sections = (results as { sections?: Array<{ contents?: unknown[] }> }).sections;
  if (rawItems.length === 0 && sections) {
    sections.forEach((sec) => {
      if (sec?.contents) rawItems.push(...sec.contents);
    });
  }

  const validTracks = rawItems.filter((item: any) => {
    if (!item) return false;
    const type = String(item.type || '').toLowerCase();
    return type.includes('video') || type.includes('song') || type.includes('music') || item.id;
  });

  return validTracks.map((track: any, index: number) => {
    const id = track.id || track.video_id || track.videoId || '';
    let name = 'Unknown Title';
    if (typeof track.title === 'string') name = track.title;
    else if (track.title?.text) name = track.title.text;
    
    let artistName = 'Unknown Artist';
    if (typeof track.author === 'string') artistName = track.author;
    else if (track.artists && track.artists[0]?.name) artistName = track.artists[0].name;

    let thumbnailUrl = '';
    if (track.thumbnails?.[0]?.url) thumbnailUrl = track.thumbnails[0].url;

    return {
      id: id || `fallback-id-${index}`,
      name,
      artists: [{ name: artistName }],
      thumbnails: [{ url: thumbnailUrl }]
    };
  });
}

// ============================================================================
// DIRECT AUDIO STREAMING
// ============================================================================
// Playback resolves a direct audio stream URL with youtubei.js and plays it
// through a single HTMLAudioElement. This bypasses the YouTube embed/iframe
// player entirely, so embed-restricted official tracks still play.

type AudioState = 'playing' | 'paused' | 'ended' | 'buffering' | 'error';

const statusListeners = new Set<(state: AudioState) => void>();
type ProgressListener = (currentTime: number, duration: number) => void;
const progressListeners = new Set<ProgressListener>();
let audioEl: HTMLAudioElement | null = null;
let currentVolume = 0.7;
// Increments per playTrack() call so a slow stream resolution that finishes
// after the user already picked another track does not clobber the new one.
let playToken = 0;

// ── Visualizer note ───────────────────────────────────────────────────────────
// We deliberately do NOT use a Web Audio AnalyserNode here. createMediaElementSource
// reroutes the <audio> element through the Web Audio graph, and for cross-origin
// media without CORS headers (all radio streams and YouTube googlevideo URLs) the
// browser ZEROES the output — silencing playback entirely. So the visualizer is
// driven by a synthetic animation instead (see Visualizer.tsx), which never touches
// the audio element and therefore never affects playback.

// ── Audio quality preference ──────────────────────────────────────────────────
// 'high'   → best bitrate (opus ~160 kbps or m4a 128 kbps) — default
// 'medium' → mid bitrate (opus ~70 kbps or m4a 128 kbps)
// 'low'    → lowest available (opus ~50 kbps / m4a 48 kbps)
type AudioQuality = 'high' | 'medium' | 'low';
let audioQualityPref: AudioQuality = 'high';

export function setAudioQuality(q: AudioQuality): void {
  if (q === audioQualityPref) return;
  audioQualityPref = q;
  // Invalidate cached URLs — they were resolved at the old quality
  urlCache.clear();
  try { localStorage.removeItem('metrolist_url_cache'); } catch {}
}

// Resolved-URL cache: stream URLs are valid for ~6h; we cache for 50min.
// Persisted to localStorage so recently-played tracks start instantly even
// after an app restart (no re-resolution round-trip).
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const URL_CACHE_TTL_MS = 50 * 60 * 1000;
const URL_CACHE_KEY = 'metrolist_url_cache';
const URL_CACHE_MAX = 200; // cap entries to keep localStorage small

// Hydrate from disk on module load, dropping any expired entries.
(function loadUrlCache() {
  try {
    const raw = localStorage.getItem(URL_CACHE_KEY);
    if (!raw) return;
    const obj: Record<string, { url: string; expiresAt: number }> = JSON.parse(raw);
    const now = Date.now();
    for (const [id, e] of Object.entries(obj)) {
      if (e.expiresAt > now) urlCache.set(id, e);
    }
  } catch {}
})();

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistUrlCache() {
  // Debounced — batch rapid writes into one serialization
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      // Trim to the newest URL_CACHE_MAX entries by expiry
      const entries = [...urlCache.entries()].sort((a, b) => b[1].expiresAt - a[1].expiresAt).slice(0, URL_CACHE_MAX);
      urlCache.clear();
      for (const [id, e] of entries) urlCache.set(id, e);
      localStorage.setItem(URL_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {}
  }, 1000);
}

// Permanent skip list: IDs where every client returned "unavailable".
// Checked before any resolution attempt so the skip cascade is instant.
const unplayableIds = new Set<string>();
export function isUnplayable(videoId: string): boolean {
  return unplayableIds.has(videoId);
}
export function markUnplayable(videoId: string): void {
  unplayableIds.add(videoId);
}

function getCachedUrl(videoId: string): string | null {
  const entry = urlCache.get(videoId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { urlCache.delete(videoId); return null; }
  return entry.url;
}

function setCachedUrl(videoId: string, url: string) {
  urlCache.set(videoId, { url, expiresAt: Date.now() + URL_CACHE_TTL_MS });
  persistUrlCache();
}

// In-flight map: deduplicates concurrent resolution calls for the same videoId.
const inFlightUrls = new Map<string, Promise<string>>();

function notifyStatus(state: AudioState) {
  statusListeners.forEach((cb) => cb(state));
}

function notifyProgress() {
  if (!audioEl) return;
  const ct = audioEl.currentTime;
  const dur = isFinite(audioEl.duration) ? audioEl.duration : 0;
  progressListeners.forEach(cb => cb(ct, dur));
}

function ensureAudio(): HTMLAudioElement {
  if (audioEl) return audioEl;
  const el = new Audio();
  el.preload = 'auto';
  el.volume = currentVolume;
  el.addEventListener('playing',  () => notifyStatus('playing'));
  el.addEventListener('pause',    () => { if (!el.ended) notifyStatus('paused'); });
  el.addEventListener('ended',    () => notifyStatus('ended'));
  el.addEventListener('waiting',  () => notifyStatus('buffering'));
  el.addEventListener('error',    () => { console.error('Audio element error:', el.error); notifyStatus('error'); });
  el.addEventListener('timeupdate',     notifyProgress);
  el.addEventListener('durationchange', notifyProgress);
  el.addEventListener('seeked',         notifyProgress);
  audioEl = el;
  return el;
}

/** Subscribe to playback progress. Returns an unsubscribe function. */
export function subscribeToProgress(cb: ProgressListener): () => void {
  progressListeners.add(cb);
  // Fire immediately with current values so the bar is populated on re-mount
  if (audioEl) {
    const dur = isFinite(audioEl.duration) ? audioEl.duration : 0;
    cb(audioEl.currentTime, dur);
  }
  return () => progressListeners.delete(cb);
}

/** Seek to an absolute position in seconds. */
export function seekTo(seconds: number): void {
  if (!audioEl) return;
  const dur = isFinite(audioEl.duration) ? audioEl.duration : 0;
  audioEl.currentTime = Math.max(0, Math.min(seconds, dur));
}

export function initAudioPlayer(): void {
  ensureAudio();
  // Pre-warm both clients in parallel during idle time so client init doesn't
  // compete with the app's first paint:
  //  - stream client (player + po_token) → first PLAY is fast
  //  - search client → first RECOMMENDATIONS / search is fast
  const prewarm = () => {
    getStreamClient().catch(() => {});
    getClient().catch(() => {});
  };
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: any) => number);
  if (ric) ric(prewarm, { timeout: 2000 });
  else setTimeout(prewarm, 200);
}

// Resolves a playable audio-only stream URL for a video id. Tries the web
// client first (uses the po_token) and falls back to mobile clients, which
// sometimes return streaming data when the web client is throttled.
export async function getAudioStreamUrl(videoId: string): Promise<string> {
  const cached = getCachedUrl(videoId);
  if (cached) return cached;

  if (unplayableIds.has(videoId)) throw new Error(`${videoId} is unplayable (cached)`);

  // Share one in-flight resolution across concurrent callers for the same id
  let promise = inFlightUrls.get(videoId);
  if (!promise) {
    promise = resolveStreamUrl(videoId).finally(() => inFlightUrls.delete(videoId));
    inFlightUrls.set(videoId, promise);
  }
  return promise;
}

// Runs one full pass over all clients. Returns a URL or null if none worked.
async function tryResolvePass(videoId: string): Promise<{ url: string | null; lastReason: string }> {
  const client = await getStreamClient();
  // Ordered by how reliably each client returns a directly playable audio URL
  // in 2025. ANDROID_VR / TV / YTMUSIC are not (yet) subject to the web SABR
  // experiment that withholds stream URLs (the "No valid URL to decipher"
  // error), so they are tried before the plain WEB client.
  const clients: Types.InnerTubeClient[] = ['ANDROID_VR', 'YTMUSIC', 'TV', 'WEB', 'IOS', 'ANDROID'];

  let lastReason = '';
  for (const c of clients) {
    try {
      const info = await client.getInfo(videoId, { client: c });
      const ps = info.playability_status;
      const hasData = !!info.streaming_data;
      if (!hasData) {
        lastReason = `${c}: ${ps?.status ?? 'NO_DATA'} ${ps?.reason ?? ''}`.trim();
        continue;
      }
      // Quality mapping:
      //   high   → highest bitrate (quality:'best', any codec)
      //   medium → prefer opus efficiency tier, fall back to mp4a best
      //   low    → lowest bitrate (quality:'bestefficiency')
      const formatOpts =
        audioQualityPref === 'low'
          ? { type: 'audio' as const, quality: 'bestefficiency' as const, format: 'any' as const }
          : audioQualityPref === 'medium'
          ? { type: 'audio' as const, quality: 'bestefficiency' as const }
          : { type: 'audio' as const, quality: 'best' as const };
      const format = info.chooseFormat(formatOpts);
      const url = await format.decipher(client.session.player);
      if (url) {
        console.log(`[stream] ${c}: resolved (quality=${audioQualityPref})`);
        return { url, lastReason };
      }
      lastReason = `${c}: empty URL after decipher`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastReason = `${c}: ${msg}`;
    }
  }
  return { url: null, lastReason };
}

// Decides whether a failure reason looks transient (worth retrying) vs. a hard
// "this video does not exist / is private / removed" that won't change on retry.
function isHardFailure(reason: string): boolean {
  return /unplayable|private|removed|not available in your|members-only|copyright|deleted|does not exist/i.test(reason);
}

async function resolveStreamUrl(videoId: string): Promise<string> {
  // Pass 1
  let { url, lastReason } = await tryResolvePass(videoId);
  if (url) { setCachedUrl(videoId, url); return url; }

  // Retry once after a short backoff for transient failures (rate limits,
  // SABR hiccups, momentary network errors). Skip retry for hard failures.
  if (!isHardFailure(lastReason)) {
    console.warn(`[stream] pass 1 failed (${lastReason}) — retrying in 600ms`);
    await new Promise(r => setTimeout(r, 600));
    const retry = await tryResolvePass(videoId);
    if (retry.url) { setCachedUrl(videoId, retry.url); return retry.url; }
    lastReason = retry.lastReason;
  }

  // Both passes failed — record so future attempts skip it instantly
  unplayableIds.add(videoId);
  throw new Error(`No playable stream. Last: ${lastReason}`);
}

// Silently pre-resolves a stream URL into cache so it's ready when the user clicks play.
// Capped at 2 concurrent prefetches to avoid flooding YouTube and triggering
// "video unavailable" rate-limit responses that would also block real play requests.
let activePrefetches = 0;
export function prefetchStreamUrl(videoId: string): void {
  if (getCachedUrl(videoId) || inFlightUrls.has(videoId)) return;
  if (activePrefetches >= 2) return;
  activePrefetches++;
  getAudioStreamUrl(videoId)
    .catch(() => {})
    .finally(() => { activePrefetches--; });
}

/** Play any direct audio URL (radio streams, local files) without YouTube resolution. */
export async function playDirectStream(url: string): Promise<void> {
  const el = ensureAudio();
  const token = ++playToken;
  notifyStatus('buffering');
  try {
    el.src = url;
    el.volume = currentVolume;
    await el.play();
  } catch (err) {
    if (token !== playToken) return;
    console.error('Failed to play direct stream:', err);
    notifyStatus('error');
  }
}

export async function playTrack(videoId: string): Promise<void> {
  const el = ensureAudio();
  const token = ++playToken;
  notifyStatus('buffering');
  try {
    // Prefer cached offline file; fall back to live stream
    const { getOfflineUrl } = await import('./offline');
    const offlineUrl = await getOfflineUrl(videoId);
    const url = offlineUrl ?? await getAudioStreamUrl(videoId);
    if (token !== playToken) return; // a newer track was requested meanwhile
    if (!url) {
      notifyStatus('error');
      return;
    }
    el.src = url;
    el.volume = currentVolume;
    await el.play();
  } catch (err) {
    if (token !== playToken) return;
    console.error('Failed to resolve/play stream:', err);
    notifyStatus('error');
  }
}

export async function pauseTrack(): Promise<void> {
  audioEl?.pause();
}

export async function resumeTrack(): Promise<void> {
  await audioEl?.play();
}

// Accepts a 0-100 volume (matching the app's volume state) and maps it to the
// HTMLAudioElement's 0-1 range.
export async function setTrackVolume(volume: number): Promise<void> {
  currentVolume = Math.min(Math.max(volume / 100, 0), 1);
  if (audioEl) audioEl.volume = currentVolume;
}

export function subscribeToAudioStatus(callback: (state: string) => void) {
  const listener = callback as (state: AudioState) => void;
  statusListeners.add(listener);
  return () => { statusListeners.delete(listener); };
}

export const setVolume = async (volume: number) => {
  await setTrackVolume(volume);
};