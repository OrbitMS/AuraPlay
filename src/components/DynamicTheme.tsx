import { useContext, useEffect, useRef } from 'react';
import { AudioContext } from '../context/AudioContext';
import { getDominantColor, lighten } from '../lib/dominantColor';

// Default brand gold (matches App.css :root)
const DEFAULTS = {
  '--gold': '#c9a84c',
  '--gold-b': '#e8c76a',
  '--gold-d': 'rgba(201,168,76,0.15)',
  '--gold-g': 'rgba(201,168,76,0.10)',
};

function hexToRgb(hex: string) {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

/**
 * Tints the app's accent CSS variables to a color sampled from the current
 * track's artwork, so the whole UI subtly adopts the album's mood. Reverts to
 * brand gold when nothing is playing or extraction fails. Smoothly transitioned.
 */
export const DynamicTheme: React.FC = () => {
  const ctx = useContext(AudioContext);
  const art = ctx?.radioStation?.favicon ?? ctx?.currentTrack?.thumbnail ?? '';
  const lastArt = useRef('');

  useEffect(() => {
    const root = document.documentElement;
    const apply = (vars: Record<string, string>) => {
      for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    };

    if (!art) { apply(DEFAULTS); lastArt.current = ''; return; }
    if (art === lastArt.current) return;
    lastArt.current = art;

    let cancelled = false;
    getDominantColor(art).then(color => {
      if (cancelled) return;
      if (!color) { apply(DEFAULTS); return; }
      const [r, g, b] = hexToRgb(color);
      apply({
        '--gold': color,
        '--gold-b': lighten(color, 0.2),
        '--gold-d': `rgba(${r},${g},${b},0.16)`,
        '--gold-g': `rgba(${r},${g},${b},0.12)`,
      });
    });
    return () => { cancelled = true; };
  }, [art]);

  return null;
};
