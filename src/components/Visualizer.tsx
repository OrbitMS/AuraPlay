import React, { useRef, useEffect } from 'react';
import { getAnalyser } from '../services/youtube';

interface Props {
  active: boolean;          // is audio playing
  height?: number;
  barColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Frequency-bar visualizer driven by the shared Web Audio AnalyserNode.
 * If real frequency data is unavailable (cross-origin stream without CORS),
 * it falls back to a smooth synthetic animation so it always looks alive.
 */
export const Visualizer: React.FC<Props> = ({
  active, height = 36, barColor = '#c9a84c', className, style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const BARS = 48;
    let dataArray: Uint8Array | null = null;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const analyser = active ? getAnalyser() : null;
      let values: number[];

      if (analyser) {
        if (!dataArray || dataArray.length !== analyser.frequencyBinCount) {
          dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        if (sum > 0) {
          // Real data — sample BARS bins across the lower-mid spectrum
          values = Array.from({ length: BARS }, (_, i) => {
            const idx = Math.floor((i / BARS) * (dataArray!.length * 0.7));
            return dataArray![idx] / 255;
          });
        } else {
          values = synthetic();
        }
      } else if (active) {
        values = synthetic();
      } else {
        values = new Array(BARS).fill(0);
      }

      const gap = 2;
      const barW = (w - gap * (BARS - 1)) / BARS;
      for (let i = 0; i < BARS; i++) {
        const v = values[i];
        const barH = Math.max(2, v * h);
        const x = i * (barW + gap);
        const y = (h - barH) / 2; // centered (mirror) look
        const alpha = 0.35 + v * 0.65;
        ctx.fillStyle = hexWithAlpha(barColor, alpha);
        roundRect(ctx, x, y, barW, barH, Math.min(barW / 2, 2));
        ctx.fill();
      }
    };

    function synthetic(): number[] {
      phaseRef.current += 0.06;
      const p = phaseRef.current;
      return Array.from({ length: BARS }, (_, i) => {
        const a = Math.sin(p + i * 0.5) * 0.5 + 0.5;
        const b = Math.sin(p * 1.7 + i * 0.23) * 0.5 + 0.5;
        return Math.max(0.08, (a * 0.6 + b * 0.4) * 0.85);
      });
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [active, barColor]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height, display: 'block', ...style }}
    />
  );
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}
