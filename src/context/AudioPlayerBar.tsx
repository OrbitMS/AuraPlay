import React, { useContext, useState } from 'react';
import { AudioContext } from '../context/AudioContext';
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Shuffle 
} from 'lucide-react'; // Make sure to npm i lucide-react if you haven't already, or replace with your icon pack

export const AudioPlayerBar: React.FC = () => {
  const audioCtx = useContext(AudioContext);
  
  // Local states for UI elements until connected to the full Iframe API
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);

  // Safeguard if context isn't ready
  if (!audioCtx) return null;

  const { currentTrack, isPlaying, togglePlay } = audioCtx;

  // Placeholder layout click actions to extend later
  const handleStop = () => {
    if (isPlaying) togglePlay(); 
    // In our next step we will make this explicitly wipe the source clear via context
    console.log("🛑 Stop clicked");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-zinc-900 border-t border-zinc-800 px-6 flex items-center justify-between text-zinc-200 select-none z-50 shadow-2xl">
      
      {/* LEFT BLOCK: Now Playing Track Metadata */}
      <div className="flex items-center w-1/4 min-w-[240px]">
        {currentTrack ? (
          <>
            <div className="w-14 h-14 bg-zinc-800 rounded-md overflow-hidden flex-shrink-0 border border-zinc-700 shadow">
              <img 
                src={currentTrack.thumbnail} 
                alt={currentTrack.title} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if thumbnail fails
                  (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/27272a/a1a1aa?text=Music';
                }}
              />
            </div>
            <div className="ml-4 overflow-hidden">
              <h4 className="text-sm font-medium text-white truncate max-w-[200px]" title={currentTrack.title}>
                {currentTrack.title}
              </h4>
              <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-[200px]">
                {currentTrack.artist}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center text-zinc-500 text-xs tracking-wide">
            <div className="w-14 h-14 bg-zinc-800/40 rounded-md border border-zinc-800/80 border-dashed mr-4 flex items-center justify-center">
              🎧
            </div>
            <span>No track loaded</span>
          </div>
        )}
      </div>

      {/* CENTER BLOCK: Main Audio Control Rig & Progress Tracker */}
      <div className="flex flex-col items-center flex-1 max-w-2xl px-4">
        
        {/* Core Deck Triggers */}
        <div className="flex items-center gap-5 mb-2">
          <button 
            onClick={() => setIsShuffling(!isShuffling)}
            className={`transition ${isShuffling ? 'text-emerald-500 hover:text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>

          <button className="text-zinc-400 hover:text-white transition" title="Previous Track">
            <SkipBack size={20} fill="currentColor" />
          </button>

          {/* Large Play / Pause Interactive Deck Button */}
          <button 
            onClick={togglePlay}
            disabled={!currentTrack}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-md bg-white text-black hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" className="ml-0" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button 
            onClick={handleStop}
            disabled={!currentTrack}
            className="text-zinc-400 hover:text-red-400 transition disabled:opacity-40 disabled:pointer-events-none" 
            title="Stop Playback"
          >
            <Square size={18} fill="currentColor" />
          </button>

          <button className="text-zinc-400 hover:text-white transition" title="Next Track">
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button 
            onClick={() => setIsLooping(!isLooping)}
            className={`transition ${isLooping ? 'text-emerald-500 hover:text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Repeat Track"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Progress Scrub Bar (Structural Representation) */}
        <div className="w-full flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
          <span>0:00</span>
          <div className="flex-1 h-1 bg-zinc-700 rounded-full relative group cursor-pointer">
            <div className="absolute top-0 left-0 h-full bg-emerald-500 w-0 rounded-full group-hover:bg-emerald-400 transition-all"></div>
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"></div>
          </div>
          <span>0:00</span>
        </div>

      </div>

      {/* RIGHT BLOCK: Volume Settings & Output Adjusters */}
      <div className="flex items-center justify-end w-1/4 min-w-[180px] gap-2">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          disabled={!currentTrack}
          className="text-zinc-400 hover:text-white transition p-1 disabled:opacity-40"
        >
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        
        <input 
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          disabled={!currentTrack}
          className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-40"
        />
      </div>

    </div>
  );
};