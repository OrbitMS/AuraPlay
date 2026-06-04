import React, { useContext, useRef } from 'react';
import { AudioContext } from '../context/AudioContext';

export const AudioPlayerBar: React.FC = () => {
  const audioContext = useContext(AudioContext);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const prevVolumeRef = useRef(70);

  if (!audioContext) return null;

  const { 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    nextTrack, 
    prevTrack, 
    isShuffling, 
    repeatMode, 
    setShuffling, 
    cycleRepeat,
    volume,
    setVolume
  } = audioContext;

  const setVolumeFromClientX = (clientX: number) => {
    const bar = volumeBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = Math.round(Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * 100);
    setVolume(pct);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setVolumeFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) setVolumeFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current || 70);
    }
  };

  return (
    <div className="h-[72px] bg-[var(--obsidian)] border-t border-[var(--bd)] flex items-center justify-between px-6 select-none flex-shrink-0 z-10 relative">
      
      {/* Left Section: Track Metadata Info */}
      <div className="w-[30%] flex items-center gap-3 min-w-0">
        {currentTrack ? (
          <>
            <img 
              src={currentTrack.thumbnail || ''} 
              alt="" 
              className="w-9 h-9 rounded-[4px] object-cover border border-[var(--bd)] flex-shrink-0 bg-[var(--s2)] animate-fade-in"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-medium tracking-[0.01em] truncate text-[var(--tp)]">
                {currentTrack.title}
              </span>
              <span className="text-[10px] tracking-[0.02em] truncate text-[var(--ts)] mt-0.5" style={{ fontFamily: 'var(--fm)' }}>
                {currentTrack.artist || 'Unknown Artist'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-[4px] border border-dashed border-[var(--bd)] flex-shrink-0 bg-[var(--s1)] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--tt)" strokeWidth="1.2" className="w-3.5 h-3.5">
                <circle cx="9" cy="18" r="3"/><circle cx="18" cy="15" r="3"/><line x1="12" y1="18" x2="12" y2="5"/><polyline points="12 5 21 3 21 15"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium tracking-[0.01em] text-[var(--tt)]">
                No Track Selected
              </span>
            </div>
          </>
        )}
      </div>

      {/* Center Section: Playback Mechanism Controls */}
      <div className="flex-1 max-w-[460px] flex flex-col items-center gap-2">
        <div className="flex items-center gap-5">
          {/* Shuffle Toggle */}
          <button 
            onClick={() => setShuffling(!isShuffling)}
            className={`bg-transparent border-none cursor-pointer p-0.5 transition-colors ${isShuffling ? 'text-[var(--gold)]' : 'text-[var(--tt)] hover:text-[var(--ts)]'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>
            </svg>
          </button>

          {/* Prev Track */}
          <button 
            onClick={prevTrack}
            className="bg-transparent border-none cursor-pointer p-0.5 text-[var(--ts)] hover:text-[var(--tp)] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="5" x2="5" y2="19"/>
            </svg>
          </button>

          {/* Play / Pause Toggle Trigger */}
          <button 
            onClick={togglePlay}
            className="w-7 h-7 rounded-full bg-[var(--tp)] text-[var(--obsidian)] flex items-center justify-center cursor-pointer hover:bg-[var(--gold-b)] hover:scale-105 active:scale-95 transition-all shadow-sm flex-shrink-0"
          >
            {isPlaying ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="4" height="16"/><rect x="17" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="ml-0.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          {/* Next Track */}
          <button 
            onClick={() => nextTrack()}
            className="bg-transparent border-none cursor-pointer p-0.5 text-[var(--ts)] hover:text-[var(--tp)] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </button>

          {/* Repeat Toggle: off -> all -> one */}
          <button 
            onClick={cycleRepeat}
            aria-label={`Repeat: ${repeatMode}`}
            title={`Repeat: ${repeatMode}`}
            className={`relative bg-transparent border-none cursor-pointer p-0.5 transition-colors ${repeatMode !== 'off' ? 'text-[var(--gold)]' : 'text-[var(--tt)] hover:text-[var(--ts)]'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[7px] font-mono font-bold leading-none bg-[var(--gold)] text-[var(--obsidian)] rounded-full w-2.5 h-2.5 flex items-center justify-center">1</span>
            )}
          </button>
        </div>

        {/* Slider Timeline Duration Track */}
        <div className="w-full flex items-center gap-2.5">
          <span className="text-[9px] text-[var(--tt)] select-none w-7 text-right" style={{ fontFamily: 'var(--fm)' }}>1:24</span>
          <div className="flex-1 h-0.5 bg-[var(--s4)] rounded-full relative cursor-pointer group">
            <div className="h-full w-[35%] bg-[var(--gold)] rounded-full absolute left-0 top-0 group-hover:bg-[var(--gold-b)] transition-colors"></div>
          </div>
          <span className="text-[9px] text-[var(--tt)] select-none w-7 text-left" style={{ fontFamily: 'var(--fm)' }}>4:07</span>
        </div>
      </div>

      {/* Right Section: Volume Slider Interface */}
      <div className="w-[30%] flex items-center justify-end gap-2.5">
        <button
          onClick={toggleMute}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          className="bg-none border-none p-0 cursor-pointer text-[var(--tt)] hover:text-[var(--ts)] transition-colors"
        >
          {volume === 0 ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </button>
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-16 py-2 flex items-center cursor-pointer group touch-none"
        >
          <div ref={volumeBarRef} className="w-full h-0.5 bg-[var(--s4)] rounded-full relative">
            <div 
              className="h-full bg-[var(--ts)] rounded-full absolute left-0 top-0 group-hover:bg-[var(--tp)] transition-colors" 
              style={{ width: `${volume}%` }}
            ></div>
          </div>
        </div>
      </div>

    </div>
  );
};