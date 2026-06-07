import React, { useContext, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { AudioContext } from '../context/AudioContext';
import { subscribeToProgress, seekTo } from '../services/youtube';
import { getLyrics, activeLineIndex, type LyricsResult } from '../services/lyrics';
import { Waveform } from './Waveform';
import { VolumeKnob } from './VolumeKnob';
import { safeImageUrl } from '../lib/safeUrl';
import { useLikes } from '../hooks/useLikes';
import { ChevronDown, Heart, Shuffle, SkipBack, SkipForward, Play, Pause, Repeat, Repeat1, Mic2, Disc3, Loader } from 'lucide-react';

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

  // ── Lyrics ──
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  const trackId = ctx?.currentTrack?.id;
  const trackTitle = ctx?.currentTrack?.title;
  const trackArtist = ctx?.currentTrack?.artist;
  const isRadio = !!ctx?.radioStation;

  useEffect(() => subscribeToProgress((ct, dur) => { setCurrentTime(ct); setDuration(dur); }), []);

  // Fetch lyrics when the track changes (skip radio)
  useEffect(() => {
    if (isRadio || !trackId || !trackTitle) { setLyrics(null); return; }
    let cancelled = false;
    setLyricsLoading(true);
    setLyrics(null);
    getLyrics(trackTitle, trackArtist || '')
      .then(r => { if (!cancelled) setLyrics(r); })
      .finally(() => { if (!cancelled) setLyricsLoading(false); });
    return () => { cancelled = true; };
  }, [trackId, isRadio, trackTitle, trackArtist]);

  const synced = lyrics?.synced ?? null;
  const activeIdx = useMemo(
    () => (synced ? activeLineIndex(synced, currentTime) : -1),
    [synced, currentTime],
  );

  // Auto-scroll the active synced line into view
  useEffect(() => {
    if (showLyrics && activeIdx >= 0) {
      activeLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeIdx, showLyrics]);

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
    isShuffling, repeatMode, setShuffling, cycleRepeat, volume, setVolume,
  } = ctx;

  const isLive = radioStation !== null;
  const title  = radioStation?.name  ?? currentTrack?.title  ?? 'Nothing Playing';
  const artist = radioStation ? (isPlaying ? 'Live Radio' : 'Radio') : (currentTrack?.artist || 'Unknown Artist');
  const art    = safeImageUrl(radioStation?.favicon ?? currentTrack?.thumbnail ?? '');
  const fillPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked  = currentTrack ? isLiked(currentTrack.id) : false;

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); draggingRef.current = true; seekFromX(e.clientX); };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => { if (draggingRef.current) seekFromX(e.clientX); };
  const onUp   = (e: React.PointerEvent<HTMLDivElement>) => { draggingRef.current = false; e.currentTarget.releasePointerCapture(e.pointerId); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-np-in"
      style={{ background: 'radial-gradient(125% 90% at 50% 0%, #2b2e35 0%, #20232a 38%, #15171c 72%, #0e0f13 100%)' }}>

      {/* slate stone texture + blurred art tint */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:
          'repeating-linear-gradient(115deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 4px),' +
          'repeating-linear-gradient(28deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 5px)',
        mixBlendMode: 'overlay', opacity: 0.6,
      }} />
      {art && (
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.1 }}>
          <img src={art} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(90px) saturate(1.5)' }} />
        </div>
      )}

      {/* Header — menu · centered title · lyrics toggle */}
      <div className="relative z-10 flex items-center justify-between px-9 pt-7">
        <button onClick={onClose} title="Collapse (Esc)"
          className="w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
          <ChevronDown size={22} />
        </button>
        <div className="text-center min-w-0 px-4">
          <h1 className="text-[26px] font-semibold truncate" style={{ color: 'var(--tp)', letterSpacing: '0.01em', fontFamily: 'var(--fd)' }}>{title}</h1>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>{artist}</p>
        </div>
        {!isLive ? (
          <button onClick={() => setShowLyrics(v => !v)} title={showLyrics ? 'Show artwork' : 'Show lyrics'}
            className="w-11 h-11 flex items-center justify-center rounded-full transition-all hover:bg-white/[0.06]"
            style={{ background: showLyrics ? 'var(--gold-g)' : 'none', border: 'none', cursor: 'pointer', color: showLyrics ? 'var(--gold)' : 'var(--ts)' }}>
            {showLyrics ? <Disc3 size={20} /> : <Mic2 size={20} />}
          </button>
        ) : <div className="w-11" />}
      </div>

      {/* Stage */}
      <div className="relative z-10 flex-1 min-h-0 px-10">
        {showLyrics && !isLive ? (
          /* ── Lyrics panel ── */
          <div className="w-full h-full overflow-y-auto scrollbar-hide py-10 text-center mx-auto"
            style={{ maxWidth: 640, maskImage: 'linear-gradient(180deg, transparent, black 12%, black 88%, transparent)', WebkitMaskImage: 'linear-gradient(180deg, transparent, black 12%, black 88%, transparent)' }}>
            {lyricsLoading ? (
              <div className="flex items-center justify-center h-full"><Loader size={22} className="animate-spin text-[var(--gold)]" /></div>
            ) : synced ? (
              synced.map((line, i) => {
                const active = i === activeIdx;
                return (
                  <p key={i} ref={active ? activeLineRef : null}
                    onClick={() => { seekTo(line.time); setCurrentTime(line.time); }}
                    className="cursor-pointer transition-all duration-200 leading-snug"
                    style={{ fontSize: active ? 24 : 19, fontWeight: active ? 700 : 500, color: active ? 'var(--tp)' : 'rgba(138,135,148,0.5)', padding: '8px 0', letterSpacing: '-0.01em' }}>
                    {line.text || '♪'}
                  </p>
                );
              })
            ) : lyrics?.plain ? (
              <p className="whitespace-pre-wrap leading-relaxed text-[16px]" style={{ color: 'var(--ts)' }}>{lyrics.plain}</p>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <Mic2 size={30} className="text-[var(--tt)] opacity-30" />
                <p className="text-[13px]" style={{ color: 'var(--tt)' }}>No lyrics found</p>
              </div>
            )}
          </div>
        ) : (
          /* ── Console: blobs + waveform + brass knobs ── */
          <div className="relative w-full h-full flex items-center justify-center">

            {/* decorative drifting blobs */}
            <div className="absolute blob pointer-events-none" style={{ width: 150, height: 110, top: '6%', left: '8%', background: 'var(--irid-soft)', opacity: 0.5, filter: 'blur(0.5px)' }} />
            <div className="absolute blob pointer-events-none" style={{ width: 120, height: 90, bottom: '8%', left: '4%', background: 'var(--irid-soft)', opacity: 0.4 }} />
            <div className="absolute blob pointer-events-none" style={{ width: 90, height: 70, top: '12%', right: '24%', background: 'var(--irid-soft)', opacity: 0.35 }} />

            {/* centre cluster: artwork blob + waveform */}
            <div className="flex items-center justify-center gap-2 w-full" style={{ maxWidth: 880 }}>
              {/* artwork blob */}
              <div className="relative flex-shrink-0 grid place-items-center" style={{ width: 'min(38vh, 320px)', height: 'min(38vh, 320px)' }}>
                <div className="absolute inset-0 pointer-events-none blob" style={{ background: 'var(--irid)', filter: 'blur(40px)', opacity: 0.4, transform: 'scale(1.05)' }} />
                <div className={`blob sheen relative w-full h-full ${isPlaying ? 'glow-accent' : ''}`}
                  style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
                  {art ? (
                    <img src={art} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--s2)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--tt)" strokeWidth="1" className="w-20 h-20"><circle cx="9" cy="18" r="3"/><circle cx="18" cy="15" r="3"/><line x1="12" y1="18" x2="12" y2="5"/><polyline points="12 5 21 3 21 15"/></svg>
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(150deg, rgba(255,255,255,0.24) 0%, transparent 38%)' }} />
                </div>
                {/* like badge */}
                {currentTrack && (
                  <button onClick={() => toggleLike(currentTrack)} title={liked ? 'Unlike' : 'Like'}
                    className="absolute bottom-2 right-3 w-10 h-10 flex items-center justify-center rounded-full glass hover:scale-105 transition-transform"
                    style={{ border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer' }}>
                    <Heart size={18} fill={liked ? 'var(--gold)' : 'none'} stroke={liked ? 'var(--gold)' : 'var(--tp)'} />
                  </button>
                )}
              </div>

              {/* waveform */}
              <div className="flex-1 min-w-0">
                <Waveform active={isPlaying} height={240} />
              </div>
            </div>

            {/* brass knob panel — docked right */}
            {!isLive && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 pr-2">
                <span className="text-[10px] tracking-[0.28em] uppercase" style={{ color: 'var(--gold)', fontFamily: 'var(--fm)' }}>Volume</span>
                <VolumeKnob value={volume} onChange={setVolume} size={108} label={`${Math.round(volume)}%`} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transport — thin-line, centered */}
      <div className="relative z-10 flex flex-col items-center gap-3.5 pb-14 pt-3">
        {!isLive ? (
          <div className="flex items-center gap-3 text-[11px] tabular-nums" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
            <span>{fmt(currentTime)}</span>
            <div ref={progressBarRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
              className="relative rounded-full cursor-pointer group touch-none" style={{ width: 280, height: 4, background: 'rgba(255,255,255,0.1)', touchAction: 'none' }}>
              <div className="h-full rounded-full absolute left-0 top-0 pointer-events-none" style={{ width: `${fillPct}%`, background: 'var(--irid)' }} />
            </div>
            <span>{fmt(duration)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-red-400" style={{ fontFamily: 'var(--fm)' }}>Live</span>
          </div>
        )}

        <div className="flex items-center gap-9 mt-1">
          <button onClick={() => setShuffling(!isShuffling)} disabled={isLive}
            style={{ background: 'none', border: 'none', cursor: isLive ? 'default' : 'pointer', color: isShuffling ? 'var(--gold)' : 'var(--ts)', opacity: isLive ? 0.3 : 1 }}>
            <Shuffle size={18} />
          </button>
          <button onClick={prevTrack} disabled={isLive}
            style={{ background: 'none', border: 'none', cursor: isLive ? 'default' : 'pointer', color: 'var(--tp)', opacity: isLive ? 0.3 : 1 }}>
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button onClick={togglePlay}
            className="flex items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-transform"
            style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.55)', cursor: 'pointer', color: 'var(--tp)', boxShadow: '0 0 28px var(--gold-g)' }}>
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 3 }} />}
          </button>
          <button onClick={() => nextTrack()} disabled={isLive}
            style={{ background: 'none', border: 'none', cursor: isLive ? 'default' : 'pointer', color: 'var(--tp)', opacity: isLive ? 0.3 : 1 }}>
            <SkipForward size={22} fill="currentColor" />
          </button>
          <button onClick={cycleRepeat} disabled={isLive}
            style={{ background: 'none', border: 'none', cursor: isLive ? 'default' : 'pointer', color: repeatMode !== 'off' ? 'var(--gold)' : 'var(--ts)', opacity: isLive ? 0.3 : 1 }}>
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
