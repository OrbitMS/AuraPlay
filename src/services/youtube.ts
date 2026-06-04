import { Innertube, UniversalCache } from 'youtubei.js';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { emit } from '@tauri-apps/api/event';

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
// DOM-BASED AUDIO PLAYER PIPELINE
// ============================================================================

export async function playTrack(videoId: string): Promise<void> {
  console.log(`🎬 Updating DOM iframe target source link for ID: ${videoId}`);
  
  const iframe = document.getElementById('native-audio-frame') as HTMLIFrameElement;
  if (iframe) {
    // Setting our origin parameter forces YouTube to trust our local Vite platform context
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&playsinline=1&origin=http://localhost:1420`;
  } else {
    console.error("Audio target iframe container could not be found in active DOM context.");
  }
}

export async function pauseTrack(): Promise<void> {
  const iframe = document.getElementById('native-audio-frame') as HTMLIFrameElement;
  if (iframe) iframe.src = 'about:blank'; // Instantly clears and tears down the media stream context
}

export async function resumeTrack(): Promise<void> {}
export async function setTrackVolume(volume: number): Promise<void> {}
export function subscribeToAudioStatus(callback: (state: string) => void) {
  return () => {};
}

export const setVolume = async (volume: number) => {
  await emit('audio-control', { command: 'set_volume', volume });
};

export async function getAudioStreamUrl(videoId: string): Promise<string> {
  return "";
}