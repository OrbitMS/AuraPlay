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
    <div className="fixed left-0 right-0 top-0 z-[45] flex flex-col animate-np-in"
      style={{ bottom: bottomOffset, background: 'rgba(6,7,10,0.92)', backdropFilter: 'blur(20px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-7 pt-6 pb-4">
        <div className="min-w-0 pr-4">
          <h2 className="text-[17px] font-semibold truncate" style={{ color: 'var(--tp)' }}>{video.title}</h2>
          <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>{video.author}</p>
        </div>
        <button onClick={onClose} title="Close (Esc)"
          className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full transition-colors hover:bg-white/[0.08]"
          style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'var(--tp)' }}>
          <X size={20} />
        </button>
      </div>

      {/* Stage */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 pb-6">
        <div className="relative w-full h-full flex items-center justify-center">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center px-8">
              <AlertCircle size={32} className="text-[var(--tt)] opacity-40" />
              <p className="text-[13px]" style={{ color: 'var(--ts)' }}>This video couldn't be played</p>
              <p className="text-[11px] opacity-60 max-w-[420px]" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>{error}</p>
            </div>
          ) : !url ? (
            <Loader size={26} className="animate-spin text-[var(--gold)]" />
          ) : (
            <video ref={videoRef} src={url} controls autoPlay playsInline
              className="max-w-full max-h-full rounded-[14px]"
              style={{ background: '#000', boxShadow: '0 30px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)' }} />
          )}
        </div>
      </div>
    </div>
  );
};
