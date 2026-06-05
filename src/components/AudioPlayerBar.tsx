import React, { useContext, useRef, useState, useEffect, useCallback } from 'react';
import { AudioContext } from '../context/AudioContext';
import { subscribeToProgress, seekTo } from '../services/youtube';

interface Props {
  onQueueToggle: () => void;
  queueOpen: boolean;
}

/** Format seconds → "m:ss" (e.g. 3:07) */
function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const AudioPlayerBar: React.FC<Props> = ({ onQueueToggle, queueOpen }) => {
  const audioContext = useContext(AudioContext);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const draggingVolumeRef = useRef(false);
  const draggingProgressRef = useRef(false);
  const prevVolumeRef = useRef(70);

  // Live playback position — local state so only this component re-renders
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return subscribeToProgress((ct, dur) => {
      setCurrentTime(ct);
      setDuration(dur);
    });
  }, []);

  // Seek to the position corresponding to a pointer X coordinate on the bar
  const seekFromClientX = useCallback((clientX: number) => {
    const bar = progressBarRef.current;
    if (!bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    seekTo(pct * duration);
    setCurrentTime(pct * duration); // optimistic update
  }, [duration]);

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
    setVolume,
    radioStation,
  } = audioContext;

  const isLive = radioStation !== null || !isFinite(duration) || (duration === 0 && isPlaying);

  const setVolumeFromClientX = (clientX: number) => {
    const bar = volumeBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = Math.round(Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * 100);
    setVolume(pct);
  };

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingVolumeRef.current = true;
    setVolumeFromClientX(e.clientX);
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingVolumeRef.current) setVolumeFromClientX(e.clientX);
  };

  const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingVolumeRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingProgressRef.current = true;
    seekFromClientX(e.clientX);
  };

  const handleProgressPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingProgressRef.current) seekFromClientX(e.clientX);
  };

  const handleProgressPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingProgressRef.current = false;
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
    <div className="h-[80px] bg-[rgba(8,8,10,0.97)] border-t border-[rgba(201,168,76,0.1)] flex items-center px-7 select-none flex-shrink-0 z-10 relative">
      {/* Gold accent line across the top */}
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.25)] to-transparent"></div>

      {/* Left Section: Now Playing */}
      <div className="w-[26%] flex items-center gap-3 min-w-0">
        {radioStation ? (
          /* Radio station display */
          <>
            <div className="w-[46px] h-[46px] rounded-[8px] flex-shrink-0 overflow-hidden border border-[rgba(201,168,76,0.25)] bg-[var(--s2)] flex items-center justify-center">
              {radioStation.favicon ? (
                <img src={radioStation.favicon} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--tt)" strokeWidth="1.5" className="w-5 h-5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold tracking-[0.01em] truncate text-[var(--tp)]">
                {radioStation.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                <span className="text-[9px] tracking-[0.07em] uppercase truncate text-[var(--gold)]" style={{ fontFamily: 'var(--fm)' }}>
                  {isPlaying ? 'Live' : 'Radio'} · {radioStation.bitrate > 0 ? `${radioStation.bitrate}kbps` : radioStation.codec}
                </span>
              </div>
            </div>
          </>
        ) : currentTrack ? (
          /* Regular track display */
          <>
            <div className="w-[46px] h-[46px] rounded-full flex-shrink-0 relative overflow-hidden border-2 border-[rgba(201,168,76,0.25)]">
              <img src={currentTrack.thumbnail || ''} alt="" className={`w-full h-full object-cover rounded-full ${isPlaying ? 'animate-spin-slow' : ''}`} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full bg-[var(--obsidian)] border border-[rgba(201,168,76,0.3)]"></div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold tracking-[0.01em] truncate text-[var(--tp)]">{currentTrack.title}</span>
              <span className="text-[9px] tracking-[0.07em] uppercase truncate text-[var(--gold)] mt-0.5" style={{ fontFamily: 'var(--fm)' }}>
                {currentTrack.artist || 'Unknown Artist'}
              </span>
            </div>
          </>
        ) : (
          /* Empty state */
          <>
            <div className="w-[46px] h-[46px] rounded-full border-2 border-dashed border-[var(--bd)] flex-shrink-0 bg-[var(--s1)] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--tt)" strokeWidth="1.2" className="w-4 h-4">
                <circle cx="9" cy="18" r="3"/><circle cx="18" cy="15" r="3"/><line x1="12" y1="18" x2="12" y2="5"/><polyline points="12 5 21 3 21 15"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium tracking-[0.01em] text-[var(--tt)]">No Track Selected</span>
            </div>
          </>
        )}
      </div>

      {/* Center Section: Playback Mechanism Controls */}
      <div className="flex-1 flex flex-col items-center gap-2">
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
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--gold-b)] to-[var(--gold)] text-[var(--obsidian)] flex items-center justify-center cursor-pointer hover:scale-[1.06] active:scale-95 transition-transform flex-shrink-0 shadow-[0_0_18px_rgba(201,168,76,0.2)]"
          >
            {isPlaying ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="ml-0.5">
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

        {/* Progress / LIVE row */}
        <div className="w-full max-w-[420px] flex items-center gap-2">
          {isLive ? (
            /* Live stream — no seek, just a pulsing bar */
            <>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-bold tracking-[0.08em] text-red-400 uppercase select-none" style={{ fontFamily: 'var(--fm)' }}>Live</span>
              </div>
              <div className="flex-1 h-1 bg-[var(--s4)] rounded-full overflow-hidden">
                <div className={`h-full bg-[var(--gold)] rounded-full ${isPlaying ? 'animate-[liveBar_2s_ease-in-out_infinite]' : 'w-full'}`} style={{ width: isPlaying ? undefined : '100%' }} />
              </div>
              <span className="text-[9px] text-[var(--tt)] select-none w-7 tabular-nums" style={{ fontFamily: 'var(--fm)' }}>∞</span>
            </>
          ) : (
            /* Seekable track bar */
            <>
              <span className="text-[9px] text-[var(--tt)] select-none w-7 text-right tabular-nums" style={{ fontFamily: 'var(--fm)' }}>
                {fmt(currentTime)}
              </span>
              <div
                ref={progressBarRef}
                onPointerDown={handleProgressPointerDown}
                onPointerMove={handleProgressPointerMove}
                onPointerUp={handleProgressPointerUp}
                className="flex-1 h-1 bg-[var(--s4)] rounded-full relative cursor-pointer group touch-none"
                style={{ touchAction: 'none' }}
              >
                <div
                  className="h-full bg-[var(--gold)] rounded-full absolute left-0 top-0 group-hover:bg-[var(--gold-b)] transition-colors pointer-events-none"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--tp)] shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[9px] text-[var(--tt)] select-none w-7 text-left tabular-nums" style={{ fontFamily: 'var(--fm)' }}>
                {fmt(duration)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Section: Volume Slider Interface */}
      <div className="w-[26%] flex items-center justify-end gap-2">
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
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </button>
        <div
          onPointerDown={handleVolumePointerDown}
          onPointerMove={handleVolumePointerMove}
          onPointerUp={handleVolumePointerUp}
          className="w-[72px] py-2 flex items-center cursor-pointer group touch-none"
        >
          <div ref={volumeBarRef} className="w-full h-0.5 bg-[var(--s4)] rounded-full relative">
            <div 
              className="h-full bg-[rgba(201,168,76,0.5)] rounded-full absolute left-0 top-0 group-hover:bg-[var(--gold)] transition-colors" 
              style={{ width: `${volume}%` }}
            ></div>
          </div>
        </div>
        <span className="text-[9px] text-[var(--tt)] select-none min-w-[22px]" style={{ fontFamily: 'var(--fm)' }}>{volume}</span>

        {/* Queue toggle */}
        <button
          onClick={onQueueToggle}
          title={queueOpen ? 'Close queue' : 'Open queue'}
          className={`ml-2 w-7 h-7 flex items-center justify-center rounded-[5px] border transition-colors ${
            queueOpen
              ? 'border-[rgba(201,168,76,0.4)] bg-[var(--gold-g)] text-[var(--gold)]'
              : 'border-transparent text-[var(--tt)] hover:text-[var(--ts)] hover:bg-white/[0.04]'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
      </div>

    </div>
  );
};