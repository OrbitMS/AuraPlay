import React, { useContext, useRef, useState, useEffect, useCallback } from 'react';
import { AudioContext } from '../context/AudioContext';
import { subscribeToProgress, seekTo } from '../services/youtube';
import { Visualizer } from './Visualizer';
import { useLikes } from '../hooks/useLikes';
import { ChevronDown, Heart, Shuffle, SkipBack, SkipForward, Play, Pause, Repeat, Repeat1 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const NowPlayingScreen: React.FC<Props> = ({ onClose }) => {
  const ctx = useContext(AudioContext);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { toggle: toggleLike, isLiked } = useLikes();

  useEffect(() => subscribeToProgress((ct, dur) => { setCurrentTime(ct); setDuration(dur); }), []);

  const seekFromX = useCallback((clientX: number) => {
    const bar = progressBarRef.current;
    if (!bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    seekTo(pct * duration);
    setCurrentTime(pct * duration);
  }, [duration]);

  // Esc to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!ctx) return null;
  const {
    currentTrack, radioStation, isPlaying, togglePlay, nextTrack, prevTrack,
    isShuffling, repeatMode, setShuffling, cycleRepeat,
  } = ctx;

  const isLive = radioStation !== null;
  const title  = radioStation?.name  ?? currentTrack?.title  ?? 'Nothing Playing';
  const artist = radioStation ? (isPlaying ? 'Live Radio' : 'Radio') : (currentTrack?.artist || 'Unknown Artist');
  const art    = radioStation?.favicon ?? currentTrack?.thumbnail ?? '';
  const fillPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked  = currentTrack ? isLiked(currentTrack.id) : false;

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); draggingRef.current = true; seekFromX(e.clientX); };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => { if (draggingRef.current) seekFromX(e.clientX); };
  const onUp   = (e: React.PointerEvent<HTMLDivElement>) => { draggingRef.current = false; e.currentTarget.releasePointerCapture(e.pointerId); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-np-in"
      style={{ background: 'linear-gradient(180deg, #14141a 0%, #0a0a0c 60%, #060608 100%)' }}>

      {/* Blurred art backdrop */}
      {art && (
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.18 }}>
          <img src={art} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(80px) saturate(1.4)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.4) 0%, rgba(6,6,8,0.9) 100%)' }} />
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-center justify-between px-8 pt-7 pb-2">
        <button onClick={onClose} title="Collapse (Esc)"
          className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
          <ChevronDown size={20} />
        </button>
        <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>
          {isLive ? 'Now Streaming' : 'Now Playing'}
        </span>
        <div className="w-10" />
      </div>

      {/* Main */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 min-h-0">
        {/* Artwork */}
        <div className="flex-shrink-0 mb-8 relative"
          style={{
            width: 'min(42vh, 340px)', height: 'min(42vh, 340px)',
            borderRadius: isLive ? 18 : '50%',
            overflow: 'hidden',
            border: '1px solid rgba(201,168,76,0.25)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(201,168,76,0.12)',
          }}>
          {art ? (
            <img src={art} alt="" className={`w-full h-full object-cover ${!isLive && isPlaying ? 'animate-spin-slow' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--s2)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--tt)" strokeWidth="1" className="w-20 h-20">
                <circle cx="9" cy="18" r="3"/><circle cx="18" cy="15" r="3"/><line x1="12" y1="18" x2="12" y2="5"/><polyline points="12 5 21 3 21 15"/>
              </svg>
            </div>
          )}
          {!isLive && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ width: 26, height: 26, background: 'var(--obsidian)', border: '2px solid rgba(201,168,76,0.4)' }} />
          )}
        </div>

        {/* Title block */}
        <div className="text-center max-w-[560px] w-full mb-7">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-[28px] font-bold truncate" style={{ color: 'var(--tp)', letterSpacing: '-0.01em' }}>{title}</h1>
            {currentTrack && (
              <button onClick={() => toggleLike(currentTrack)} title={liked ? 'Unlike' : 'Like'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <Heart size={20} fill={liked ? '#c9a84c' : 'none'} stroke={liked ? '#c9a84c' : 'var(--ts)'} />
              </button>
            )}
          </div>
          <p className="text-[14px] mt-2 truncate" style={{ color: 'var(--gold)', fontFamily: 'var(--fm)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {artist}
          </p>
        </div>

        {/* Progress */}
        <div className="w-full max-w-[560px] mb-8">
          {isLive ? (
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-red-400" style={{ fontFamily: 'var(--fm)' }}>Live</span>
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'var(--s4)' }}>
                <div className={`h-full rounded-full ${isPlaying ? 'animate-[liveBar_2s_ease-in-out_infinite]' : ''}`} style={{ background: 'var(--gold)', width: isPlaying ? undefined : '100%' }} />
              </div>
            </div>
          ) : (
            <>
              <div ref={progressBarRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
                className="relative rounded-full cursor-pointer group touch-none" style={{ height: 6, background: 'var(--s4)', touchAction: 'none' }}>
                <div className="h-full rounded-full absolute left-0 top-0 pointer-events-none"
                  style={{ width: `${fillPct}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-b))' }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ width: 16, height: 16, background: 'var(--tp)', left: `${fillPct}%`, boxShadow: '0 0 8px rgba(201,168,76,0.5)' }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>{fmt(currentTime)}</span>
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>{fmt(duration)}</span>
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8 mb-8">
          <button onClick={() => setShuffling(!isShuffling)} disabled={isLive}
            style={{ background: 'none', border: 'none', cursor: isLive ? 'default' : 'pointer', color: isShuffling ? 'var(--gold)' : 'var(--ts)', opacity: isLive ? 0.3 : 1 }}>
            <Shuffle size={18} />
          </button>
          <button onClick={prevTrack} disabled={isLive}
            style={{ background: 'none', border: 'none', cursor: isLive ? 'default' : 'pointer', color: 'var(--tp)', opacity: isLive ? 0.3 : 1 }}>
            <SkipBack size={24} fill="currentColor" />
          </button>
          <button onClick={togglePlay}
            className="flex items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-transform"
            style={{ width: 68, height: 68, background: 'linear-gradient(135deg, var(--gold-b), var(--gold))', border: 'none', cursor: 'pointer', color: 'var(--obsidian)', boxShadow: '0 6px 28px rgba(201,168,76,0.4)' }}>
            {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />}
          </button>
          <button onClick={() => nextTrack()} disabled={isLive}
            style={{ background: 'none', border: 'none', cursor: isLive ? 'default' : 'pointer', color: 'var(--tp)', opacity: isLive ? 0.3 : 1 }}>
            <SkipForward size={24} fill="currentColor" />
          </button>
          <button onClick={cycleRepeat} disabled={isLive}
            style={{ background: 'none', border: 'none', cursor: isLive ? 'default' : 'pointer', color: repeatMode !== 'off' ? 'var(--gold)' : 'var(--ts)', opacity: isLive ? 0.3 : 1 }}>
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>
      </div>

      {/* Visualizer footer */}
      <div className="relative px-8 pb-8">
        <Visualizer active={isPlaying} height={64} />
      </div>
    </div>
  );
};
