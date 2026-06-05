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
async function getStreamClient() {
  if (streamYt) return streamYt;

  // A throwaway client gives us the visitor_data that ties the po_token to this session.
  // Uses the same spoofed-header fetch as search; without an Origin/User-Agent the
  // youtubei v1/player and v1/next calls are rejected by YouTube with HTTP 403.
  const seed = await Innertube.create({ fetch: innertubeFetch, retrieve_player: false });
  const visitorData = seed.session.context.client.visitorData ?? '';
  const poToken = visitorData ? await generatePoToken(visitorData) : null;
  console.log(`[stream] po_token: ${poToken ? `generated (${poToken.length} chars)` : 'NULL — BotGuard failed, web-client streams will be blocked'}`);

  streamYt = await Innertube.create({
    fetch: innertubeFetch,
    cache: new UniversalCache(true),
    generate_session_locally: true,
    retrieve_player: true,
    ...(poToken ? { po_token: poToken, visitor_data: visitorData } : {}),
  });
  return streamYt;
}

type FeedTrack = { id: string; name: string; artists: { name: string }[]; thumbnails: { url: string }[] };

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
// Only accepts songs and videos (item_type = 'song' | 'video') so albums and
// playlists (which have browse IDs instead of video IDs) are excluded.
function normalizeFeedItem(item: any): FeedTrack | null {
  if (!item) return null;

  // Only playable types — albums/playlists/artists have browse IDs, not video IDs
  const type: string = item.item_type ?? '';
  if (type && type !== 'song' && type !== 'video' && type !== 'endpoint') return null;

  // endpoint.payload.videoId is the canonical video ID for MusicTwoRowItem songs
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
let audioEl: HTMLAudioElement | null = null;
let currentVolume = 0.7;
// Increments per playTrack() call so a slow stream resolution that finishes
// after the user already picked another track does not clobber the new one.
let playToken = 0;

// In-memory URL cache: resolved stream URLs are valid for ~6h; cache for 50min
// to give ample margin. Keyed by videoId.
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const URL_CACHE_TTL_MS = 50 * 60 * 1000;

function getCachedUrl(videoId: string): string | null {
  const entry = urlCache.get(videoId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { urlCache.delete(videoId); return null; }
  return entry.url;
}

function setCachedUrl(videoId: string, url: string) {
  urlCache.set(videoId, { url, expiresAt: Date.now() + URL_CACHE_TTL_MS });
}

function notifyStatus(state: AudioState) {
  statusListeners.forEach((cb) => cb(state));
}

function ensureAudio(): HTMLAudioElement {
  if (audioEl) return audioEl;
  const el = new Audio();
  el.preload = 'auto';
  el.volume = currentVolume;
  el.addEventListener('playing', () => notifyStatus('playing'));
  el.addEventListener('pause', () => {
    if (!el.ended) notifyStatus('paused');
  });
  el.addEventListener('ended', () => notifyStatus('ended'));
  el.addEventListener('waiting', () => notifyStatus('buffering'));
  el.addEventListener('error', () => {
    console.error('Audio element error:', el.error);
    notifyStatus('error');
  });
  audioEl = el;
  return el;
}

export function initAudioPlayer(): void {
  ensureAudio();
  // Pre-warm the stream client in the background so the first play is fast
  getStreamClient().catch(() => {});
}

// Resolves a playable audio-only stream URL for a video id. Tries the web
// client first (uses the po_token) and falls back to mobile clients, which
// sometimes return streaming data when the web client is throttled.
export async function getAudioStreamUrl(videoId: string): Promise<string> {
  const cached = getCachedUrl(videoId);
  if (cached) return cached;

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
      console.log(`[stream] ${c}: playability=${ps?.status ?? '?'} reason="${ps?.reason ?? ''}" streaming_data=${hasData}`);
      if (!hasData) {
        lastReason = `${c}: ${ps?.status ?? 'NO_DATA'} ${ps?.reason ?? ''}`.trim();
        continue;
      }
      const format = info.chooseFormat({ type: 'audio', quality: 'best' });
      const f = format as unknown as { itag?: number; url?: string; signature_cipher?: string; cipher?: string };
      console.log(`[stream] ${c}: itag=${f.itag} hasUrl=${!!f.url} hasSigCipher=${!!f.signature_cipher} hasCipher=${!!f.cipher}`);
      const url = await format.decipher(client.session.player);
      if (url) {
        console.log(`[stream] ${c}: resolved playable URL`);
        setCachedUrl(videoId, url);
        return url;
      }
      lastReason = `${c}: empty URL after decipher`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[stream] ${c} failed: ${msg}`);
      // "No valid URL to decipher" => SABR withheld the URL for this client; the
      // loop continues to a client that still returns one.
      lastReason = `${c}: ${msg}`;
    }
  }

  throw new Error(`No playable stream. Last: ${lastReason}`);
}

// Silently pre-resolves a stream URL into cache so it's ready when the user clicks play.
export function prefetchStreamUrl(videoId: string): void {
  if (getCachedUrl(videoId)) return;
  getAudioStreamUrl(videoId).catch(() => {});
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