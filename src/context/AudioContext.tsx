import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  playTrack as nativePlayTrack,
  pauseTrack as nativePauseTrack,
  resumeTrack as nativeResumeTrack,
  setVolume as nativeSetVolume,
  subscribeToAudioStatus,
  initAudioPlayer,
  getAudioStreamUrl,
  getRelatedTracks,
  isUnplayable,
  playDirectStream,
} from '../services/youtube';
import type { RadioStation } from '../services/radio';
import {
  downloadTrackOffline,
  listDownloaded,
  deleteDownload,
} from '../services/offline';
import { useHistory } from '../hooks/useHistory';
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
  playAtIndex: (index: number) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  stopTrack: () => void;
  setVolume: (volume: number) => void;
  downloadTrack: (track: Track) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  removeFromQueue: (index: number) => void;
  autoQueue: boolean;
  autoQueueStart: number | null;
  toggleAutoQueue: () => void;
  radioStation: RadioStation | null;
  playStation: (station: RadioStation) => void;
}

export type { RadioStation };

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
  const [autoQueue, setAutoQueue] = useState(true);
  const [autoQueueStart, setAutoQueueStart] = useState<number | null>(null);
  const [radioStation, setRadioStation] = useState<RadioStation | null>(null);
  const { push: pushHistory } = useHistory();

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // Counts tracks skipped due to playback errors so we stop instead of looping
  // forever when an entire queue is unplayable (e.g. embed-restricted videos).
  const skipCountRef = useRef(0);
  // Prevents concurrent auto-queue fetches.
  const isFetchingAutoRef = useRef(false);

  useEffect(() => {
    initAudioPlayer();
    listDownloaded().then((tracks) => {
      setDownloadedIds(new Set(tracks.map((t) => t.id)));
    });
  }, []);

  // Auto-queue: when the current track is the last in the queue, fetch related
  // tracks and append them so playback continues seamlessly.
  useEffect(() => {
    if (!autoQueue) return;
    if (currentIndex < 0 || queue.length === 0) return;
    if (isFetchingAutoRef.current) return;

    // Trigger when we're on the last track in the queue
    const isLastTrack = currentIndex === queue.length - 1;
    if (!isLastTrack) return;

    const trackId = queue[currentIndex]?.id;
    if (!trackId) return;

    isFetchingAutoRef.current = true;
    getRelatedTracks(trackId)
      .then((related) => {
        if (related.length === 0) return;
        setQueue((prev) => {
          // Only append if we're still on the same last track
          if (prev[currentIndex]?.id !== trackId) return prev;
          setAutoQueueStart(prev.length);
          return [...prev, ...related.slice(0, 5)];
        });
      })
      .finally(() => { isFetchingAutoRef.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue.length, autoQueue]);

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
          if (currentTrack) pushHistory(currentTrack);
          break;
        case 'paused':
          setIsPlaying(false);
          break;
        case 'error':
          // Skip unplayable tracks, but give up once we've cycled the whole queue.
          // Delay prevents rapid-fire cascades that flood YouTube with requests.
          if (queue.length > 0 && skipCountRef.current < queue.length) {
            skipCountRef.current += 1;
            setTimeout(() => nextTrack(), 400);
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

  const toggleAutoQueue = () => setAutoQueue(v => !v);

  const playStation = (station: RadioStation) => {
    skipCountRef.current = 0;
    setRadioStation(station);
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(true);
    playDirectStream(station.url_resolved).catch(err => console.error('Radio play failed:', err));
  };

  const playTrack = (track: Track, completePlaylist?: Track[]) => {
    skipCountRef.current = 0;
    setRadioStation(null);          // leaving radio mode
    setAutoQueueStart(null);
    isFetchingAutoRef.current = false;
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
    // Works for both regular tracks and radio (radio has no currentTrack)
    if (!currentTrack && !radioStation) return;
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
    const track = queue[index];
    if (!track) return;
    // If this ID is known-unplayable, skip it immediately without a network attempt
    if (isUnplayable(track.id)) {
      skipCountRef.current += 1;
      if (skipCountRef.current < queue.length) {
        const next = getNextIndex(index, queue.length, { shuffle: isShuffling, repeatMode, auto: true });
        if (next !== null) { playIndex(next); return; }
      }
      setIsPlaying(false);
      return;
    }
    setCurrentIndex(index);
    setIsPlaying(true);
    nativePlayTrack(track.id).catch(err => console.error("Playback failed:", err));
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
    playIndex(currentIndex > 0 ? currentIndex - 1 : queue.length - 1);
  };

  const playAtIndex = (index: number) => {
    if (index < 0 || index >= queue.length) return;
    playIndex(index);
  };

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setQueue(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    // Keep currentIndex pointing at the same track after reorder
    setCurrentIndex(prev => {
      if (prev === fromIndex) return toIndex;
      if (fromIndex < prev && toIndex >= prev) return prev - 1;
      if (fromIndex > prev && toIndex <= prev) return prev + 1;
      return prev;
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    const isCurrentTrack = index === currentIndex;
    const newQueue = queue.filter((_, i) => i !== index);

    if (isCurrentTrack) {
      // Stop playback and reset if the current track is removed
      nativePauseTrack().catch(() => {});
      setIsPlaying(false);
      setQueue(newQueue);
      setCurrentIndex(-1);
    } else {
      setQueue(newQueue);
      setCurrentIndex(prev => (index < prev ? prev - 1 : prev));
    }
  }, [queue, currentIndex]);

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
      playAtIndex,
      togglePlay,
      nextTrack,
      prevTrack,
      stopTrack,
      setVolume,
      downloadTrack,
      removeDownload,
      reorderQueue,
      removeFromQueue,
      autoQueue,
      autoQueueStart,
      toggleAutoQueue,
      radioStation,
      playStation,
    }}>
      {children}
    </AudioContext.Provider>
  );
};