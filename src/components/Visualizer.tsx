import React, { useRef, useEffect } from 'react';

interface Props {
  active: boolean;          // is audio playing
  height?: number;
  barColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Synthetic frequency-bar visualizer. Driven by sine waves rather than a real
 * Web Audio AnalyserNode — routing the <audio> element through createMediaElement-
 * Source zeroes cross-origin streams (radio + googlevideo) due to CORS, which
 * would silence playback. The synthetic approach never touches the audio element.
 */
export const Visualizer: React.FC<Props> = ({
  active, height = 36, barColor = 'var(--gold)', className, style,
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

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const renderBars = (values: number[]) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const gap = 2;
      const barW = (w - gap * (BARS - 1)) / BARS;
      for (let i = 0; i < BARS; i++) {
        const v = values[i];
        const barH = Math.max(2, v * h);
        const x = i * (barW + gap);
        const y = (h - barH) / 2;
        const alpha = 0.35 + v * 0.65;
        ctx.fillStyle = hexWithAlpha(barColor, alpha);
        roundRect(ctx, x, y, barW, barH, Math.min(barW / 2, 2));
        ctx.fill();
      }
    };

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      renderBars(synthetic());
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

    const stop = () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    };

    // Only run the animation loop while playing AND the window is visible.
    // Otherwise stop the rAF entirely (zero idle/background CPU) and leave a
    // static flat frame.
    const sync = () => {
      const shouldRun = active && !document.hidden;
      if (shouldRun && !rafRef.current) {
        draw();
      } else if (!shouldRun) {
        stop();
        renderBars(new Array(BARS).fill(0)); // static flat bars
      }
    };

    document.addEventListener('visibilitychange', sync);
    sync();

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
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
