import React, { useContext, useState } from 'react';
import { AudioProvider, AudioContext } from './context/AudioContext';
import { SearchView } from './views/SearchView';
import { 
  Music, 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Shuffle 
} from 'lucide-react';

const BottomPlayerBar: React.FC = () => {
  const audioContext = useContext(AudioContext);
  
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);

  if (!audioContext || !audioContext.currentTrack) return null;

  const { currentTrack, isPlaying, togglePlay } = audioContext;

  const handleStop = () => {
    if (isPlaying) togglePlay();
    console.log("🛑 Stop command requested");
  };

  return (
    <div className="h-24 bg-[#16161a] border-t border-neutral-800/60 px-6 flex items-center justify-between z-50 select-none shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.5)]">
      
      {/* LEFT WING: Track Details & Album Metadata */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        <img 
          src={currentTrack.thumbnail} 
          alt={currentTrack.title} 
          className="w-14 h-14 rounded-md object-cover border border-neutral-800 shadow-md" 
        />
        <div className="overflow-hidden">
          <h4 className="text-sm font-semibold text-neutral-100 truncate max-w-[180px]" title={currentTrack.title}>
            {currentTrack.title}
          </h4>
          <p className="text-xs text-neutral-400 truncate max-w-[180px] mt-0.5">
            {currentTrack.artist}
          </p>
        </div>
      </div>

      {/* CENTER ENGINE: Full Deck Navigation Controls & Progress Slider */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
        
        {/* Playback Buttons Layout */}
        <div className="flex items-center gap-5">
          <button 
            onClick={() => setIsShuffling(!isShuffling)}
            className={`transition-colors duration-200 ${isShuffling ? 'text-emerald-500 hover:text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>

          <button className="text-neutral-400 hover:text-white transition-colors" title="Previous Track">
            <SkipBack size={18} fill="currentColor" />
          </button>

          {/* Interactive Play / Pause Circle */}
          <button 
            onClick={togglePlay}
            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition active:scale-95 shadow-md"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button 
            onClick={handleStop}
            className="text-neutral-400 hover:text-red-500 transition-colors" 
            title="Stop Playback"
          >
            <Square size={15} fill="currentColor" />
          </button>

          <button className="text-neutral-400 hover:text-white transition-colors" title="Next Track">
            <SkipForward size={18} fill="currentColor" />
          </button>

          <button 
            onClick={() => setIsLooping(!isLooping)}
            className={`transition-colors duration-200 ${isLooping ? 'text-emerald-500 hover:text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}
            title="Repeat Track"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Progress Timeline Layout Wire */}
        <div className="w-full flex items-center gap-3 text-[10px] text-neutral-400 font-mono">
          <span>0:00</span>
          <div className="flex-1 h-1 bg-neutral-700 rounded-full relative group cursor-pointer">
            <div className="absolute top-0 left-0 h-full bg-emerald-500 w-0 rounded-full group-hover:bg-emerald-400 transition-all"></div>
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"></div>
          </div>
          <span>0:00</span>
        </div>

      </div>

      {/* RIGHT WING: Mute Toggle & Volume Slider */}
      <div className="flex items-center justify-end w-1/4 min-w-[150px] gap-3">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="text-neutral-400 hover:text-white transition-colors p-1"
        >
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        
        <input 
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-24 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
        />
      </div>

    </div>
  );
};

function App() {
  const audioContext = useContext(AudioContext);
  // Optional flag to check if the bottom bar is rendered right now
  const hasTrack = !!audioContext?.currentTrack;

  return (
    <AudioProvider>
      <div className="flex flex-col h-screen w-screen bg-[#09090b] text-white overflow-hidden font-sans">
        
        {/* UPPER MAIN APP AREA */}
        <div className="flex flex-1 min-h-0 w-full overflow-hidden">
          
          {/* Left Sidebar Pane */}
          <div className="w-60 bg-[#0f0f12] border-r border-neutral-900/60 p-4 flex flex-col gap-4 select-none flex-shrink-0">
            <div className="flex items-center gap-2.5 px-2 py-3 border-b border-neutral-800/40">
              <Music className="text-red-500 w-5 h-5" />
              <span className="font-bold text-base tracking-wide text-neutral-100">Metrolist Desktop</span>
            </div>
            
            <nav className="flex flex-col gap-1">
              <div className="px-3 py-2 bg-neutral-800/60 text-white rounded-lg font-medium text-sm cursor-pointer transition-colors hover:bg-neutral-800">
                Search
              </div>
            </nav>
          </div>

          {/* Right Content Scroll Container */}
          <div className="flex-1 h-full bg-[#09090b] overflow-y-auto custom-scrollbar">
            <div className="p-6">
              <SearchView />
            </div>
          </div>

        </div>

        {/* BOTTOM FIXED INTERACTIVE DECK BAR */}
        {/* It is now nested out of the scrolling panels entirely, acting as a permanent footer lock */}
        <BottomPlayerBar />

      </div>
    </AudioProvider>
  );
}

export default App;