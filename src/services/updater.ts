import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

export interface UpdateInfo {
  version: string;
  notes?: string;
  update: Update;
}

/** Checks the release endpoint for a newer signed build. Returns null if up to date. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri) return null;
  try {
    const update = await check();
    if (update?.available) {
      return { version: update.version, notes: update.body, update };
    }
  } catch (err) {
    console.warn('Update check failed:', err);
  }
  return null;
}

/** Downloads + installs the update, then relaunches the app. */
export async function installUpdate(info: UpdateInfo, onProgress?: (pct: number) => void): Promise<void> {
  let downloaded = 0;
  let total = 0;
  await info.update.downloadAndInstall(event => {
    switch (event.event) {
      case 'Started':
        total = event.data.contentLength ?? 0;
        break;
      case 'Progress':
        downloaded += event.data.chunkLength;
        if (total > 0) onProgress?.(Math.min(100, Math.round((downloaded / total) * 100)));
        break;
      case 'Finished':
        onProgress?.(100);
        break;
    }
  });
  await relaunch();
}
