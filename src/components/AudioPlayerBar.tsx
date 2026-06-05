import React, { useContext, useRef, useState, useEffect, useCallback } from 'react';
import { AudioContext } from '../context/AudioContext';
import { subscribeToProgress, seekTo } from '../services/youtube';

interface Props {
  onQueueToggle: () => void;
  queueOpen: boolean;
}

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const AudioPlayerBar: React.FC<Props> = ({ onQueueToggle, queueOpen }) => {
  const audioContext = useContext(AudioContext);
  const volumeBarRef   = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const draggingVolumeRef   = useRef(false);
  const draggingProgressRef = useRef(false);
  const prevVolumeRef = useRef(70);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);

  useEffect(() => subscribeToProgress((ct, dur) => { setCurrentTime(ct); setDuration(dur); }), []);

  const seekFromClientX = useCallback((clientX: number) => {
    const bar = progressBarRef.current;
    if (!bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct  = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    seekTo(pct * duration);
    setCurrentTime(pct * duration);
  }, [duration]);

  if (!audioContext) return null;

  const {
    currentTrack, isPlaying, togglePlay, nextTrack, prevTrack,
    isShuffling, repeatMode, setShuffling, cycleRepeat,
    volume, setVolume, radioStation,
  } = audioContext;

  const isLive = radioStation !== null || !isFinite(duration) || (duration === 0 && isPlaying);
  const fillPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  /* ── Volume helpers ── */
  const setVolumeFromX = (clientX: number) => {
    const bar = volumeBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    if (rect.width === 0) return;
    setVolume(Math.round(Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * 100));
  };
  const onVolDown = (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); draggingVolumeRef.current = true; setVolumeFromX(e.clientX); };
  const onVolMove = (e: React.PointerEvent<HTMLDivElement>) => { if (draggingVolumeRef.current) setVolumeFromX(e.clientX); };
  const onVolUp   = (e: React.PointerEvent<HTMLDivElement>) => { draggingVolumeRef.current = false; e.currentTarget.releasePointerCapture(e.pointerId); };

  /* ── Progress helpers ── */
  const onProgDown = (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); draggingProgressRef.current = true; seekFromClientX(e.clientX); };
  const onProgMove = (e: React.PointerEvent<HTMLDivElement>) => { if (draggingProgressRef.current) seekFromClientX(e.clientX); };
  const onProgUp   = (e: React.PointerEvent<HTMLDivElement>) => { draggingProgressRef.current = false; e.currentTarget.releasePointerCapture(e.pointerId); };

  const toggleMute = () => {
    if (volume > 0) { prevVolumeRef.current = volume; setVolume(0); }
    else            { setVolume(prevVolumeRef.current || 70); }
  };

  /* ── Icon sizes ── */
  const S = 15; // secondary control icon size
  const T = 12; // tertiary (shuffle/repeat) size

  return (
    <div
      className="flex items-center select-none flex-shrink-0 z-10 relative"
      style={{
        height: '110px',
        paddingLeft: '28px',
        paddingRight: '28px',
        background: 'linear-gradient(180deg, rgba(6,6,8,0.98) 0%, rgba(4,4,6,1) 100%)',
        borderTop: '1px solid rgba(201,168,76,0.12)',
      }}
    >
      {/* Top gradient accent */}
      <div className="absolute top-0 left-[8%] right-[8%] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />

      {/* ── LEFT: Now Playing ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 min-w-0" style={{ width: '28%' }}>
        {radioStation ? (
          <>
            {/* Radio artwork */}
            <div className="flex-shrink-0 rounded-[10px] overflow-hidden flex items-center justify-center"
              style={{ width: 62, height: 62, background: 'var(--s2)', border: '1.5px solid rgba(201,168,76,0.2)' }}>
              {radioStation.favicon
                ? <img src={radioStation.favicon} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <svg viewBox="0 0 24 24" fill="none" stroke="var(--tt)" strokeWidth="1.5" className="w-6 h-6"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              }
            </div>
            <div className="flex flex-col min-w-0 gap-1">
              <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--tp)', letterSpacing: '0.005em' }}>{radioStation.name}</span>
              <div className="flex items-center gap-2">
                {isPlaying && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                <span className="text-[11px] truncate" style={{ color: 'var(--gold)', fontFamily: 'var(--fm)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {isPlaying ? 'Live' : 'Radio'} · {radioStation.bitrate > 0 ? `${radioStation.bitrate}kbps` : radioStation.codec}
                </span>
              </div>
            </div>
          </>
        ) : currentTrack ? (
          <>
            {/* Vinyl disc */}
            <div className="flex-shrink-0 rounded-full relative overflow-hidden"
              style={{ width: 62, height: 62, border: '2px solid rgba(201,168,76,0.3)', boxShadow: isPlaying ? '0 0 20px rgba(201,168,76,0.15)' : 'none', transition: 'box-shadow 0.4s' }}>
              <img
                src={currentTrack.thumbnail || ''}
                alt=""
                className={`w-full h-full object-cover rounded-full ${isPlaying ? 'animate-spin-slow' : ''}`}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full"
                style={{ background: 'var(--obsidian)', border: '1.5px solid rgba(201,168,76,0.35)' }} />
            </div>
            <div className="flex flex-col min-w-0 gap-1">
              <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--tp)', letterSpacing: '0.005em' }}>{currentTrack.title}</span>
              <span className="text-[11px] truncate" style={{ color: 'var(--gold)', fontFamily: 'var(--fm)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {currentTrack.artist || 'Unknown Artist'}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Empty state */}
            <div className="flex-shrink-0 rounded-full flex items-center justify-center"
              style={{ width: 62, height: 62, background: 'var(--s1)', border: '2px dashed rgba(255,255,255,0.08)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--tt)" strokeWidth="1.2" className="w-5 h-5">
                <circle cx="9" cy="18" r="3"/><circle cx="18" cy="15" r="3"/><line x1="12" y1="18" x2="12" y2="5"/><polyline points="12 5 21 3 21 15"/>
              </svg>
            </div>
            <span className="text-[12px]" style={{ color: 'var(--tt)' }}>Nothing playing</span>
          </>
        )}
      </div>

      {/* ── CENTER: Controls + Progress ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center gap-3">

        {/* Transport buttons */}
        <div className="flex items-center gap-6">
          {/* Shuffle */}
          <button onClick={() => setShuffling(!isShuffling)}
            className="cursor-pointer p-1 rounded transition-all"
            style={{ background: 'none', border: 'none', color: isShuffling ? 'var(--gold)' : 'var(--tt)', opacity: isShuffling ? 1 : 0.7 }}
            title="Shuffle">
            <svg width={T} height={T} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>
            </svg>
          </button>

          {/* Prev */}
          <button onClick={prevTrack} style={{ background: 'none', border: 'none', color: 'var(--ts)', cursor: 'pointer', padding: '4px' }}
            className="hover:text-[var(--tp)] transition-colors" title="Previous">
            <svg width={S} height={S} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="5" x2="5" y2="19"/>
            </svg>
          </button>

          {/* Play / Pause */}
          <button onClick={togglePlay}
            className="flex items-center justify-center rounded-full flex-shrink-0 hover:scale-[1.08] active:scale-95 transition-transform"
            style={{
              width: 50, height: 50,
              background: 'linear-gradient(135deg, var(--gold-b), var(--gold))',
              border: 'none', cursor: 'pointer', color: 'var(--obsidian)',
              boxShadow: '0 4px 20px rgba(201,168,76,0.35), 0 0 0 1px rgba(201,168,76,0.15)',
            }}>
            {isPlaying ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ marginLeft: 2 }}>
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          {/* Next */}
          <button onClick={() => nextTrack()} style={{ background: 'none', border: 'none', color: 'var(--ts)', cursor: 'pointer', padding: '4px' }}
            className="hover:text-[var(--tp)] transition-colors" title="Next">
            <svg width={S} height={S} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </button>

          {/* Repeat */}
          <button onClick={cycleRepeat} title={`Repeat: ${repeatMode}`}
            className="cursor-pointer p-1 rounded relative transition-all"
            style={{ background: 'none', border: 'none', color: repeatMode !== 'off' ? 'var(--gold)' : 'var(--tt)', opacity: repeatMode !== 'off' ? 1 : 0.7 }}>
            <svg width={T} height={T} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            {repeatMode === 'one' && (
              <span className="absolute -top-0.5 -right-0.5 text-[7px] font-bold leading-none flex items-center justify-center rounded-full"
                style={{ width: 11, height: 11, background: 'var(--gold)', color: 'var(--obsidian)', fontFamily: 'var(--fm)' }}>1</span>
            )}
          </button>
        </div>

        {/* Progress / LIVE bar */}
        <div className="w-full flex items-center gap-3" style={{ maxWidth: 520 }}>
          {isLive ? (
            <>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.1em] text-red-400 uppercase select-none" style={{ fontFamily: 'var(--fm)' }}>Live</span>
              </div>
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'var(--s4)' }}>
                <div className={`h-full rounded-full ${isPlaying ? 'animate-[liveBar_2s_ease-in-out_infinite]' : ''}`}
                  style={{ background: 'var(--gold)', width: isPlaying ? undefined : '100%' }} />
              </div>
              <span className="text-[10px] text-[var(--tt)] select-none tabular-nums w-8" style={{ fontFamily: 'var(--fm)' }}>∞</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-[var(--ts)] select-none text-right tabular-nums" style={{ fontFamily: 'var(--fm)', minWidth: 32 }}>
                {fmt(currentTime)}
              </span>
              <div
                ref={progressBarRef}
                onPointerDown={onProgDown} onPointerMove={onProgMove} onPointerUp={onProgUp}
                className="flex-1 rounded-full relative cursor-pointer group touch-none"
                style={{ height: 5, background: 'var(--s4)', touchAction: 'none' }}
              >
                <div className="h-full rounded-full absolute left-0 top-0 pointer-events-none group-hover:opacity-90 transition-opacity"
                  style={{ width: `${fillPct}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-b))' }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ width: 14, height: 14, background: 'var(--tp)', left: `${fillPct}%`, boxShadow: '0 0 6px rgba(201,168,76,0.4)' }} />
              </div>
              <span className="text-[10px] text-[var(--ts)] select-none text-left tabular-nums" style={{ fontFamily: 'var(--fm)', minWidth: 32 }}>
                {fmt(duration)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: Volume + Queue ─────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3" style={{ width: '28%' }}>

        {/* Mute toggle */}
        <button onClick={toggleMute} title={volume === 0 ? 'Unmute' : 'Mute'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--ts)' }}
          className="hover:text-[var(--tp)] transition-colors">
          {volume === 0 ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </button>

        {/* Volume slider */}
        <div onPointerDown={onVolDown} onPointerMove={onVolMove} onPointerUp={onVolUp}
          className="flex items-center cursor-pointer group touch-none" style={{ width: 90, padding: '8px 0' }}>
          <div ref={volumeBarRef} className="w-full rounded-full relative" style={{ height: 4, background: 'var(--s4)' }}>
            <div className="h-full rounded-full absolute left-0 top-0 group-hover:opacity-100 transition-all"
              style={{ width: `${volume}%`, background: `rgba(201,168,76,${volume > 0 ? '0.6' : '0'})` }} />
          </div>
        </div>

        {/* Volume number */}
        <span className="text-[10px] select-none tabular-nums" style={{ fontFamily: 'var(--fm)', color: 'var(--tt)', minWidth: 24 }}>
          {volume}
        </span>

        {/* Queue toggle */}
        <button onClick={onQueueToggle} title={queueOpen ? 'Close queue' : 'Open queue'}
          className="flex items-center justify-center rounded-[6px] transition-all"
          style={{
            width: 32, height: 32, border: 'none', cursor: 'pointer',
            background: queueOpen ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
            color: queueOpen ? 'var(--gold)' : 'var(--ts)',
            outline: queueOpen ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
};
