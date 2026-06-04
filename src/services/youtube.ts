import { Innertube } from 'youtubei.js';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { emit } from '@tauri-apps/api/event'; // Correct v2 import

let innertube: Innertube | null = null;

export async function getInnertube() {
  if (innertube) return innertube;
  innertube = await Innertube.create({
    fetch: async (url, options) => {
      const modifiedOptions = { ...options };
      if (modifiedOptions.method === 'GET') delete modifiedOptions.body;
      return await tauriFetch(url, modifiedOptions as any);
    }
  });
  return innertube;
}

export async function searchMusic(query: string) {
  const yt = await getInnertube();
  const searchResults = await yt.search(query, { type: 'video' });
  return searchResults.results.map((item: any) => ({
    id: item.id,
    name: item.title?.text || "Unknown",
    thumbnails: item.thumbnails,
    artists: item.author ? [{ name: item.author.name }] : []
  }));
}

// Added the missing exports required by AudioContext.tsx
export const playTrack = (videoId: string) => emit('audio-control', { command: 'play', videoId });
export const pauseTrack = () => emit('audio-control', { command: 'pause' });
export const resumeTrack = () => emit('audio-control', { command: 'resume' });
export const setVolume = (volume: number) => emit('audio-control', { command: 'set_volume', volume });

export const subscribeToAudioStatus = (callback: (state: string) => void) => {
  import('@tauri-apps/api/event').then(({ listen }) => {
    listen('audio-status', (e: any) => callback(e.payload.state));
  });
};