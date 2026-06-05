import { useState, useCallback } from 'react';

export type AudioQuality = 'high' | 'medium' | 'low';

export interface AppSettings {
  audioQuality: AudioQuality;
}

const DEFAULTS: AppSettings = { audioQuality: 'high' };
const KEY = 'metrolist_settings';

function load(): AppSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(load);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, update };
}

/** Read current settings without React — for use in youtube.ts init */
export function loadSettings(): AppSettings {
  return load();
}
