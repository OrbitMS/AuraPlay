import React, { createContext, useState, useEffect } from 'react';
import { 
  playTrack as nativePlayTrack, 
  pauseTrack as nativePauseTrack, 
  resumeTrack as nativeResumeTrack,
  setVolume as nativeSetVolume,
  subscribeToAudioStatus 
} from '../services/youtube';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  currentIndex: number;
  isLooping: boolean;
  isShuffling: boolean;
  volume: number;
  setLooping: (val: boolean) => void;
  setShuffling: (val: boolean) => void;
  playTrack: (track: Track, completePlaylist?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  stopTrack: () => void;
  setVolume: (volume: number) => void;
}

export const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [volume, setVolumeState] = useState<number>(70); // Initialize standard fallback volume at 70%

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  useEffect(() => {
    const unlistenFn = subscribeToAudioStatus((state: string) => {
      console.log(`🔊 Audio state update: ${state}`);
      switch (state) {
        case 'playing':
          setIsPlaying(true);
          break;
        case 'paused':
          setIsPlaying(false);
          break;
        case 'ended':
          // Auto advance to next song when current finishes
          if (isLooping) {
            // Replay same song
            if (currentTrack) nativePlayTrack(currentTrack.id);
          } else {
            nextTrack();
          }
          break;
        default:
          break;
      }
    });

    return () => {
      if (typeof unlistenFn === 'function') unlistenFn();
    };
  }, [currentIndex, queue, isLooping, isShuffling, currentTrack]);

  const playTrack = (track: Track, completePlaylist?: Track[]) => {
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

  const nextTrack = () => {
    if (queue.length === 0) return;
    
    if (isShuffling) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      setCurrentIndex(randomIndex);
      return;
    }

    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Loop back to start of album if at the end
      setCurrentIndex(0);
    }
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(queue.length - 1); // Wrap to end
    }
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
      isLooping,
      isShuffling,
      volume,
      setLooping: setIsLooping,
      setShuffling: setIsShuffling,
      playTrack,
      togglePlay,
      nextTrack,
      prevTrack,
      stopTrack,
      setVolume
    }}>
      {children}
    </AudioContext.Provider>
  );
};