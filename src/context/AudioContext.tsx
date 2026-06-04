import React, { createContext, useState, useEffect } from 'react';
import { 
  playTrack as nativePlayTrack, 
  pauseTrack as nativePauseTrack, 
  resumeTrack as nativeResumeTrack,
  subscribeToAudioStatus 
} from '../services/youtube';

interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
}

export const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // FIX: Set up the listener synchronously to match our modern YouTube controller layer
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
          setIsPlaying(false);
          break;
        default:
          break;
      }
    });

    // Automatically unsubscribes on unmount safely
    return () => {
      if (typeof unlistenFn === 'function') {
        unlistenFn();
      }
    };
  }, []);

  const playTrack = async (track: Track) => {
    try {
      setCurrentTrack(track);
      setIsPlaying(true); // Assume active playback immediately on navigation stream load
      await nativePlayTrack(track.id);
    } catch (err) {
      console.error("Playback execution failed:", err);
      setIsPlaying(false);
    }
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

  return (
    <AudioContext.Provider value={{ currentTrack, isPlaying, playTrack, togglePlay }}>
      {children}
    </AudioContext.Provider>
  );
};