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
  prefetchStreamUrl,
  pauseTrack,
  type VideoResult,
} from '../services/youtube';
import { listDownloaded as listDownloadedTracks, type OfflineTrack } from '../services/offline';
import type { RadioStation } from '../services/radio';
import {
  downloadTrackOffline,
  deleteDownload,
} from '../services/offline';
import { useHistory } from '../hooks/useHistory';
import { recordPlay } from '../hooks/useStats';
import { getNextIndex, cycleRepeatMode, type RepeatMode } from '../lib/queue';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  /** Direct audio URL (Internet Archive, Jamendo, etc.). When set, playback
   *  streams this URL directly instead of resolving via YouTube. */
  url?: string;
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
  /** Music-video overlay state + controls. */
  videoOverlay: VideoResult | null;
  openVideo: (v: VideoResult, list?: VideoResult[]) => void;
  closeVideo: () => void;
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
  downloaded: OfflineTrack[];
  refreshDownloaded: () => void;
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
  const [downloaded, setDownloaded] = useState<OfflineTrack[]>([]);
  const [videoOverlay, setVideoOverlay] = useState<VideoResult | null>(null);
  const [videoQueue, setVideoQueue] = useState<VideoResult[]>([]);
  const [videoIndex, setVideoIndex] = useState(-1);
  const { push: pushHistory } = useHistory();

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // Counts tracks skipped due to playback errors so we stop instead of looping
  // forever when an entire queue is unplayable (e.g. embed-restricted videos).
  const skipCountRef = useRef(0);
  // Prevents concurrent auto-queue fetches.
  const isFetchingAutoRef = useRef(false);

  const refreshDownloaded = useCallback(() => {
    listDownloadedTracks().then((tracks) => {
      setDownloaded(tracks);
      setDownloadedIds(new Set(tracks.map((t) => t.id)));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    initAudioPlayer();
    refreshDownloaded();
  }, [refreshDownloaded]);

  // Prefetch the upcoming track's stream URL as soon as the current one is set,
  // so clicking "next" plays instantly instead of waiting on resolution.
  useEffect(() => {
    if (radioStation || queue.length === 0 || currentIndex < 0) return;
    const nextIdx = currentIndex + 1 < queue.length ? currentIndex + 1 : 0;
    const next = queue[nextIdx];
    if (next && !next.url && next.id !== queue[currentIndex]?.id) prefetchStreamUrl(next.id);
  }, [currentIndex, queue, radioStation]);

  // Auto-queue: when the current track is the last in the queue, fetch related
  // tracks and append them so playback continues seamlessly.
  useEffect(() => {
    if (!autoQueue) return;
    if (currentIndex < 0 || queue.length === 0) return;
    if (isFetchingAutoRef.current) return;

    // Trigger when we're on the last track in the queue
    const isLastTrack = currentIndex === queue.length - 1;
    if (!isLastTrack) return;

    const cur = queue[currentIndex];
    const trackId = cur?.id;
    if (!trackId || cur?.url) return; // auto-queue only applies to YouTube tracks

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
      setDownloaded((prev) => prev.some(t => t.id === track.id) ? prev
        : [...prev, { id: track.id, title: track.title, artist: track.artist, thumbnail: track.thumbnail }]);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingIds((prev) => { const s = new Set(prev); s.delete(track.id); return s; });
    }
  }, [downloadingIds, downloadedIds]);

  const removeDownload = useCallback(async (id: string) => {
    await deleteDownload(id);
    setDownloadedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    setDownloaded((prev) => prev.filter(t => t.id !== id));
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
          if (videoOverlay) { setIsPlaying(false); break; }
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
          // A finished video must not trigger the audio pipeline.
          if (videoOverlay) { setIsPlaying(false); break; }
          // Auto advance to next song when current finishes
          if (repeatMode === 'one') {
            // Replay same song
            if (currentTrack?.url) playDirectStream(currentTrack.url).catch(() => {});
            else if (currentTrack) nativePlayTrack(currentTrack.id);
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
  }, [currentIndex, queue, repeatMode, isShuffling, currentTrack, videoOverlay]);

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
    recordPlay(track);
    if (track.url) playDirectStream(track.url).catch(err => console.error("Playback failed:", err));
    else nativePlayTrack(track.id).catch(err => console.error("Playback failed:", err));
  };

  const openVideo = (v: VideoResult, list?: VideoResult[]) => {
    // Stop any audio immediately so the song and video never play in parallel.
    pauseTrack().catch(() => {});
    skipCountRef.current = 0;
    setRadioStation(null);
    setAutoQueueStart(null);
    isFetchingAutoRef.current = false;
    const q = list && list.length ? list : [v];
    setVideoQueue(q);
    setVideoIndex(Math.max(0, q.findIndex(x => x.id === v.id)));
    const track: Track = { id: v.id, title: v.title, artist: v.author, thumbnail: v.thumbnail };
    setQueue([track]);
    setCurrentIndex(0);
    setIsPlaying(true);
    recordPlay(track);
    setVideoOverlay(v);
    // No nativePlayTrack(): the <video> element drives playback and is
    // registered with the service so the transport controls it.
  };

  // Jump to another video in the current video list (wraps around).
  const openVideoAt = (i: number) => {
    if (videoQueue.length === 0) return;
    const ni = ((i % videoQueue.length) + videoQueue.length) % videoQueue.length;
    openVideo(videoQueue[ni], videoQueue);
  };

  const closeVideo = () => {
    setVideoOverlay(null);
    setVideoQueue([]);
    setVideoIndex(-1);
    nativePauseTrack().catch(() => {});
    setIsPlaying(false);
    setCurrentIndex(-1);
    setQueue([]);
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
    // While a music video is open, the <video> drives playback — never start the
    // audio pipeline (would play the song in parallel with the video).
    if (videoOverlay) return;
    const track = queue[index];
    if (!track) return;
    // Direct-URL tracks (Internet Archive, Jamendo) skip YouTube resolution
    if (track.url) {
      setCurrentIndex(index);
      setIsPlaying(true);
      recordPlay(track);
      playDirectStream(track.url).catch(err => console.error("Playback failed:", err));
      return;
    }
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
    recordPlay(track);
    nativePlayTrack(track.id).catch(err => console.error("Playback failed:", err));
  };

  // `auto` is true when called from the 'ended' handler (vs. the user clicking
  // next). With repeat off, the queue stops at the end on auto-advance but a
  // manual next still wraps to the start.
  const nextTrack = (auto = false) => {
    if (videoOverlay) { openVideoAt(videoIndex + 1); return; }
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
    if (videoOverlay) { openVideoAt(videoIndex - 1); return; }
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
      videoOverlay,
      openVideo,
      closeVideo,
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
      downloaded,
      refreshDownloaded,
    }}>
      {children}
    </AudioContext.Provider>
  );
};