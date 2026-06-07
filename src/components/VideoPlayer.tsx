import React, { useEffect, useRef, useState } from 'react';
import { getVideoStreamUrl, registerVideoElement, unregisterVideoElement, type VideoResult } from '../services/youtube';
import { X, Loader, AlertCircle } from 'lucide-react';

interface Props {
  video: VideoResult;
  onClose: () => void;
  /** Height of the bottom transport bar, so the overlay stops above it. */
  bottomOffset?: number;
}

export const VideoPlayer: React.FC<Props> = ({ video, onClose, bottomOffset = 0 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setUrl(null); setError('');
    getVideoStreamUrl(video.id)
      .then(u => { if (!cancelled) setUrl(u); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load video'); });
    return () => { cancelled = true; };
  }, [video.id]);

  // Register the <video> as the active media target so the bottom transport bar
  // (and Now Playing) controls it. Unregister on close/unmount.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !url) return;
    registerVideoElement(el);
    return () => unregisterVideoElement(el);
  }, [url]);

  // Esc to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="group fixed left-0 right-0 top-0 z-[45] animate-np-in"
      style={{ bottom: bottomOffset, background: '#000' }}>

      {/* Video fills the stage edge-to-edge — native, no frame */}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8">
          <AlertCircle size={32} className="text-[var(--tt)] opacity-40" />
          <p className="text-[13px]" style={{ color: 'var(--ts)' }}>This video couldn't be played</p>
          <p className="text-[11px] opacity-60 max-w-[420px]" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>{error}</p>
        </div>
      ) : !url ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader size={28} className="animate-spin text-[var(--gold)]" />
        </div>
      ) : (
        <video ref={videoRef} src={url} controls autoPlay playsInline
          className="absolute inset-0 w-full h-full" style={{ background: '#000', objectFit: 'contain' }} />
      )}

      {/* Floating title + close — fade in on hover, no boxed header */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between gap-4 px-6 pt-5 pb-10 pointer-events-none
        opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <div className="min-w-0 pr-4">
          <h2 className="text-[16px] font-semibold truncate" style={{ color: '#fff' }}>{video.title}</h2>
          <p className="text-[12px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--fm)' }}>{video.author}</p>
        </div>
        <button onClick={onClose} title="Close (Esc)"
          className="pointer-events-auto w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-colors hover:bg-white/[0.15]"
          style={{ background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer', color: '#fff' }}>
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
