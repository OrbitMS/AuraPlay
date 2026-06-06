import React, { useCallback, useRef } from 'react';

interface Props {
  value: number;            // 0–100
  onChange: (v: number) => void;
  size?: number;
}

/**
 * Brass rotary knob — drag vertically (or scroll) to change volume.
 * Maps 0–100 onto a −135°…+135° sweep, the classic analog throw.
 */
export const VolumeKnob: React.FC<Props> = ({ value, onChange, size = 64 }) => {
  const startRef = useRef<{ y: number; v: number } | null>(null);
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const angle = -135 + (clamp(value) / 100) * 270;

  const onDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { y: e.clientY, v: value };
  }, [value]);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const dy = startRef.current.y - e.clientY;     // up = louder
    onChange(clamp(Math.round(startRef.current.v + dy * 0.6)));
  }, [onChange]);

  const onUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    startRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    onChange(clamp(value + (e.deltaY < 0 ? 3 : -3)));
  }, [value, onChange]);

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onWheel={onWheel}
        title={`Volume ${Math.round(value)}%`}
        className="knob relative cursor-ns-resize touch-none"
        style={{ width: size, height: size, touchAction: 'none' }}
      >
        {/* progress ring */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 pointer-events-none" style={{ transform: 'rotate(135deg)' }}>
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"
            strokeDasharray={`${270 / 360 * 289} 289`} strokeLinecap="round" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#kg)" strokeWidth="4"
            strokeDasharray={`${(clamp(value) / 100) * (270 / 360) * 289} 289`} strokeLinecap="round" />
          <defs>
            <linearGradient id="kg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6fe9ff" />
              <stop offset="50%" stopColor="#9db4ff" />
              <stop offset="100%" stopColor="#ff9ed8" />
            </linearGradient>
          </defs>
        </svg>
        {/* indicator notch */}
        <div className="absolute left-1/2 top-1/2 pointer-events-none"
          style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)`, width: '100%', height: '100%' }}>
          <div className="absolute left-1/2 -translate-x-1/2"
            style={{ top: '12%', width: 3, height: '22%', borderRadius: 3, background: 'rgba(255,255,255,0.92)', boxShadow: '0 0 6px rgba(157,180,255,0.9)' }} />
        </div>
      </div>
      <span className="text-[10px] tabular-nums tracking-[0.1em]" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>
        {Math.round(value)}
      </span>
    </div>
  );
};
