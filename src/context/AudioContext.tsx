import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  playTrack as nativePlayTrack,
  pauseTrack as nativePauseTrack,
  resumeTrack as nativeResumeTrack,
  setVolume as nativeSetVolume,
  subscribeToAudioStatus,
  initAudioPlayer,
  getAudioStreamUrl,
} from '../services/youtube';
import {
  downloadTrackOffline,
  listDownloaded,
  deleteDownload,
} from '../services/offline';
import { getNextIndex, cycleRepeatMode, type RepeatMode } from '../lib/queue';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

export type { RepeatMode };

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  currentIndex: number;
  repeatMode: RepeatMode;
  isShuffling: boolean;
  volume: number;
  downloadedIds: Set<string>;
  downloadingIds: Set<string>;
  cycleRepeat: () => void;
  setShuffling: (val: boolean) => void;
  playTrack: (track: Track, completePlaylist?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  stopTrack: () => void;
  setVolume: (volume: number) => void;
  downloadTrack: (track: Track) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
}

export const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffling, setIsShuffling] = useState(false);
  const [volume, setVolumeState] = useState<number>(70); // Initialize standard fallback volume at 70%
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // Counts tracks skipped due to playback errors so we stop instead of looping
  // forever when an entire queue is unplayable (e.g. embed-restricted videos).
  const skipCountRef = useRef(0);

  useEffect(() => {
    initAudioPlayer();
    listDownloaded().then((tracks) => {
      setDownloadedIds(new Set(tracks.map((t) => t.id)));
    });
  }, []);

  const downloadTrack = useCallback(async (track: Track) => {
    if (downloadingIds.has(track.id) || downloadedIds.has(track.id)) return;
    setDownloadingIds((prev) => new Set(prev).add(track.id));
    try {
      const url = await getAudioStreamUrl(track.id);
      await downloadTrackOffline(track.id, url, track.title, track.artist, track.thumbnail);
      setDownloadedIds((prev) => new Set(prev).add(track.id));
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingIds((prev) => { const s = new Set(prev); s.delete(track.id); return s; });
    }
  }, [downloadingIds, downloadedIds]);

  const removeDownload = useCallback(async (id: string) => {
    await deleteDownload(id);
    setDownloadedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  useEffect(() => {
    const unlistenFn = subscribeToAudioStatus((state: string) => {
      console.log(`🔊 Audio state update: ${state}`);
      switch (state) {
        case 'playing':
          skipCountRef.current = 0;
          setIsPlaying(true);
          break;
        case 'paused':
          setIsPlaying(false);
          break;
        case 'error':
          // Skip unplayable tracks, but give up once we've cycled the whole queue.
          if (queue.length > 0 && skipCountRef.current < queue.length) {
            skipCountRef.current += 1;
            nextTrack();
          } else {
            console.warn('No playable track found in queue.');
            setIsPlaying(false);
          }
          break;
        case 'ended':
          // Auto advance to next song when current finishes
          if (repeatMode === 'one') {
            // Replay same song
            if (currentTrack) nativePlayTrack(currentTrack.id);
          } else {
            nextTrack(true);
          }
          break;
        default:
          break;
      }
    });

    return () => {
      if (typeof unlistenFn === 'function') unlistenFn();
    };
  }, [currentIndex, queue, repeatMode, isShuffling, currentTrack]);

  const playTrack = (track: Track, completePlaylist?: Track[]) => {
    skipCountRef.current = 0;
    if (completePlaylist && completePlaylist.length > 0) {
      setQueue(completePlaylist);
      const idx = completePlaylist.findIndex(t => t.id === track.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue([track]);
      setCurrentIndex(0);
    }
    setIsPlaying(true);
    nativePlayTrack(track.id).catch(err => console.error("Playback failed:", err));
  };

  const togglePlay = async () => {
    if (!currentTrack) return;
    try {
      if (isPlaying) {
        await nativePauseTrack();
        setIsPlaying(false); 
      } else {
        await nativeResumeTrack();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Toggle-Play failed:", err);
    }
  };

  const playIndex = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
    nativePlayTrack(queue[index].id).catch(err => console.error("Playback failed:", err));
  };

  // `auto` is true when called from the 'ended' handler (vs. the user clicking
  // next). With repeat off, the queue stops at the end on auto-advance but a
  // manual next still wraps to the start.
  const nextTrack = (auto = false) => {
    if (queue.length === 0) return;

    const next = getNextIndex(currentIndex, queue.length, { shuffle: isShuffling, repeatMode, auto });
    if (next === null) {
      setIsPlaying(false);
      return;
    }
    playIndex(next);
  };

  const cycleRepeat = () => {
    setRepeatMode(cycleRepeatMode);
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    playIndex(currentIndex > 0 ? currentIndex - 1 : queue.length - 1); // Wrap to end
  };

  const stopTrack = () => {
    nativePauseTrack().catch(() => {});
    setIsPlaying(false);
    setCurrentIndex(-1);
    setQueue([]);
  };

  const setVolume = async (val: number) => {
    setVolumeState(val);
    try {
      await nativeSetVolume(val);
    } catch (err) {
      console.error("Volume IPC broadcast failure:", err);
    }
  };

  return (
    <AudioContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      currentIndex,
      repeatMode,
      isShuffling,
      volume,
      downloadedIds,
      downloadingIds,
      cycleRepeat,
      setShuffling: setIsShuffling,
      playTrack,
      togglePlay,
      nextTrack,
      prevTrack,
      stopTrack,
      setVolume,
      downloadTrack,
      removeDownload,
    }}>
      {children}
    </AudioContext.Provider>
  );
};