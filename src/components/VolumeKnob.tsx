import React, { useCallback, useRef } from 'react';

interface Props {
  value: number;            // 0–100
  onChange: (v: number) => void;
  size?: number;
  label?: string;           // small label under the gauge (e.g. "TRACK")
}

/**
 * Brass rotary knob with a tick-mark gauge ring — drag vertically or scroll to
 * change the value. Maps 0–100 onto a −135°…+135° sweep (the classic analog throw).
 */
export const VolumeKnob: React.FC<Props> = ({ value, onChange, size = 96, label }) => {
  const draggingRef = useRef(false);
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const angle = -135 + (clamp(value) / 100) * 270;

  // Map a pointer position (relative to the knob centre) to a 0–100 value along
  // the −135°…+135° arc — so the knob turns to follow the mouse like a real dial.
  const valueFromPointer = (el: HTMLElement, clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    let deg = Math.atan2(dx, -dy) * 180 / Math.PI; // 0 = up, clockwise positive
    if (deg < -135) deg = -135;
    if (deg > 135) deg = 135;
    return clamp(Math.round(((deg + 135) / 270) * 100));
  };

  const onDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    onChange(valueFromPointer(e.currentTarget, e.clientX, e.clientY));
  }, [onChange]);
  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    onChange(valueFromPointer(e.currentTarget, e.clientX, e.clientY));
  }, [onChange]);
  const onUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }, []);
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    onChange(clamp(value + (e.deltaY < 0 ? 3 : -3)));
  }, [value, onChange]);

  // tick ring: 23 ticks across the 270° active arc
  const TICKS = 23;
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const a = -135 + (i / (TICKS - 1)) * 270;
    const on = (clamp(value) / 100) * 270 >= (i / (TICKS - 1)) * 270;
    return { a, on };
  });

  return (
    <div className="flex flex-col items-center gap-2.5 select-none">
      <div className="relative" style={{ width: size, height: size }}>
        {/* tick gauge */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 pointer-events-none">
          {ticks.map((tk, i) => {
            const rad = (tk.a - 90) * Math.PI / 180;
            const r1 = 48, r2 = 43;
            return (
              <line key={i}
                x1={50 + r1 * Math.cos(rad)} y1={50 + r1 * Math.sin(rad)}
                x2={50 + r2 * Math.cos(rad)} y2={50 + r2 * Math.sin(rad)}
                stroke={tk.on ? '#d9b96a' : 'rgba(255,255,255,0.14)'}
                strokeWidth={tk.on ? 2.4 : 1.6} strokeLinecap="round" />
            );
          })}
        </svg>
        {/* brass body */}
        <div
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onWheel={onWheel}
          title={`${Math.round(value)}%`}
          className="knob absolute cursor-ns-resize touch-none"
          style={{ inset: '16%', touchAction: 'none' }}
        >
          {/* indicator notch */}
          <div className="absolute left-1/2 top-1/2"
            style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)`, width: '100%', height: '100%' }}>
            <div className="absolute left-1/2 -translate-x-1/2"
              style={{ top: '8%', width: 3, height: '26%', borderRadius: 3, background: 'rgba(40,28,8,0.85)', boxShadow: '0 0 3px rgba(0,0,0,0.4)' }} />
          </div>
        </div>
      </div>
      {label && (
        <span className="text-[9px] tracking-[0.22em] uppercase" style={{ color: 'var(--gold)', fontFamily: 'var(--fm)' }}>
          {label}
        </span>
      )}
    </div>
  );
};
