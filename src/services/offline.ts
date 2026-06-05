import { invoke, convertFileSrc } from '@tauri-apps/api/core';

export interface OfflineTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

export async function downloadTrackOffline(
  id: string,
  url: string,
  title: string,
  artist: string,
  thumbnail: string,
): Promise<void> {
  if (!isTauri) return;
  await invoke('download_track', { id, url, title, artist, thumbnail });
}

export async function listDownloaded(): Promise<OfflineTrack[]> {
  if (!isTauri) return [];
  return invoke('list_downloaded');
}

export async function deleteDownload(id: string): Promise<void> {
  if (!isTauri) return;
  await invoke('delete_download', { id });
}

export async function getOfflineUrl(id: string): Promise<string | null> {
  if (!isTauri) return null;
  try {
    const path: string = await invoke('get_offline_path', { id });
    return convertFileSrc(path);
  } catch {
    return null;
  }
}
