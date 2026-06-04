import { Innertube, UniversalCache } from 'youtubei.js';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

let yt: Innertube | null = null;

export async function getClient() {
  if (!yt) {
    yt = await Innertube.create({
      fetch: async (input, init) => {
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
      },
      cache: new UniversalCache({ storage: 'indexeddb' }), 
      generate_session_locally: true,
      retrieve_player: false
    });
  }
  return yt;
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

  if (rawItems.length === 0 && results.sections) {
    results.sections.forEach((sec: any) => {
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
// YOUTUBE IFRAME PLAYER
// ============================================================================
// Playback uses the YouTube IFrame Player API loaded into a hidden #yt-player
// element in the main window. This gives programmatic play/pause/volume control
// and real playback-state events, which the previous DOM-iframe approach lacked.

type AudioState = 'playing' | 'paused' | 'ended' | 'buffering' | 'error';

let player: any = null;
let playerReady = false;
let pendingVideoId: string | null = null;
const statusListeners = new Set<(state: AudioState) => void>();

function notifyStatus(state: AudioState) {
  statusListeners.forEach((cb) => cb(state));
}

function ensurePlayer(): void {
  if (player || typeof window === 'undefined') return;

  const create = () => {
    const YT = (window as any).YT;
    if (!YT || !YT.Player) return;
    player = new YT.Player('yt-player', {
      height: '0',
      width: '0',
      playerVars: { autoplay: 1, controls: 0, playsinline: 1, origin: window.location.origin, enablejsapi: 1 },
      events: {
        onReady: () => {
          playerReady = true;
          if (pendingVideoId) {
            player.loadVideoById(pendingVideoId);
            pendingVideoId = null;
          }
        },
        onStateChange: (event: any) => {
          const State = (window as any).YT.PlayerState;
          switch (event.data) {
            case State.PLAYING: notifyStatus('playing'); break;
            case State.PAUSED: notifyStatus('paused'); break;
            case State.ENDED: notifyStatus('ended'); break;
            case State.BUFFERING: notifyStatus('buffering'); break;
          }
        },
        // Error codes 100/101/150 mean the video is unavailable or its owner
        // disabled embedded playback (common for official YouTube Music tracks).
        onError: (event: any) => {
          console.error('YT player error code:', event && event.data);
          notifyStatus('error');
        },
      },
    });
  };

  if ((window as any).YT && (window as any).YT.Player) {
    create();
  } else {
    (window as any).onYouTubeIframeAPIReady = create;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
}

export function initAudioPlayer(): void {
  ensurePlayer();
}

export async function playTrack(videoId: string): Promise<void> {
  ensurePlayer();
  if (player && playerReady) {
    player.loadVideoById(videoId);
  } else {
    pendingVideoId = videoId;
  }
}

export async function pauseTrack(): Promise<void> {
  if (player && playerReady) player.pauseVideo();
}

export async function resumeTrack(): Promise<void> {
  if (player && playerReady) player.playVideo();
}

export async function setTrackVolume(volume: number): Promise<void> {
  if (player && playerReady) player.setVolume(volume);
}

export function subscribeToAudioStatus(callback: (state: string) => void) {
  const listener = callback as (state: AudioState) => void;
  statusListeners.add(listener);
  return () => { statusListeners.delete(listener); };
}

export const setVolume = async (volume: number) => {
  await setTrackVolume(volume);
};

export async function getAudioStreamUrl(_videoId: string): Promise<string> {
  return "";
}