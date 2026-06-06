import React, { useEffect, useRef } from 'react';

interface Props {
  active: boolean;
  height?: number;
  className?: string;
}

/**
 * Central glassy iridescent waveform — a symmetric (mirrored) spindle of bars,
 * tall in the middle and tapering at the edges, animated when playing.
 * Synthetic (no real audio analyser — cross-origin streams can't be tapped).
 */
export const Waveform: React.FC<Props> = ({ active, height = 200, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const mid = h / 2;
      ctx.clearRect(0, 0, w, h);

      const bars = Math.max(48, Math.floor(w / 7));
      const gap = w / bars;
      const bw = Math.max(2, gap * 0.5);
      tRef.current += active ? 0.05 : 0.008;
      const t = tRef.current;

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0,   '#6fe9ff');
      grad.addColorStop(0.4, '#9db4ff');
      grad.addColorStop(0.7, '#b69bff');
      grad.addColorStop(1,   '#ff9ed8');

      for (let i = 0; i < bars; i++) {
        const x = i * gap + gap / 2;
        const n = i / (bars - 1);              // 0..1
        // spindle envelope: tall in the centre, tapered at the edges
        const env = Math.pow(Math.sin(n * Math.PI), 0.9);
        const wob = active
          ? (0.55 + 0.45 * Math.abs(Math.sin(t * 1.3 + i * 0.5) * Math.cos(t * 0.7 + i * 0.25)))
          : (0.34 + 0.06 * Math.sin(t + i * 0.4));
        const amp = env * wob * (mid - 6);

        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.9;
        // rounded mirrored bar
        const top = mid - amp, bh = amp * 2;
        const r = bw / 2;
        ctx.beginPath();
        ctx.roundRect(x - bw / 2, top, bw, bh, r);
        ctx.fill();
        // glassy bright core
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.roundRect(x - bw / 6, mid - amp * 0.5, bw / 3, amp, bw / 6);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height, display: 'block', filter: 'drop-shadow(0 8px 24px rgba(110,160,255,0.35))' }}
    />
  );
};
