import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

/**
 * Extracts a vibrant accent color from an image URL.
 * Fetches via Tauri's native HTTP (bypasses CORS) → blob → canvas sample,
 * so the canvas isn't tainted the way a cross-origin <img> would be.
 * Returns a hex string normalized to a pleasant accent on a dark UI, or null.
 */

const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
const cache = new Map<string, string | null>();

export async function getDominantColor(url: string | null | undefined): Promise<string | null> {
  if (!url || !isTauri) return null;
  if (cache.has(url)) return cache.get(url)!;

  try {
    const res = await tauriFetch(url, {} as any);
    if (!res.ok) { cache.set(url, null); return null; }
    const buf = await res.arrayBuffer();
    const blob = new Blob([buf]);
    const objectUrl = URL.createObjectURL(blob);
    const color = await sampleColor(objectUrl).finally(() => URL.revokeObjectURL(objectUrl));
    cache.set(url, color);
    return color;
  } catch {
    cache.set(url, null);
    return null;
  }
}

function sampleColor(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const size = 24;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Weighted average favouring saturated, mid-bright pixels
        let r = 0, g = 0, b = 0, wsum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const R = data[i], G = data[i + 1], B = data[i + 2], A = data[i + 3];
          if (A < 128) continue;
          const max = Math.max(R, G, B), min = Math.min(R, G, B);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (R + G + B) / 3;
          // weight: prefer saturated, avoid near-black / near-white
          const w = (0.2 + sat) * (lum > 25 && lum < 240 ? 1 : 0.15);
          r += R * w; g += G * w; b += B * w; wsum += w;
        }
        if (wsum === 0) return resolve(null);
        r /= wsum; g /= wsum; b /= wsum;
        resolve(normalize(r, g, b));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Push the color into a tasteful accent range for a dark theme.
function normalize(r: number, g: number, b: number): string {
  let [h, s, l] = rgbToHsl(r, g, b);
  s = Math.min(1, Math.max(0.45, s));   // ensure it's colorful
  l = Math.min(0.66, Math.max(0.5, l)); // mid-bright so it reads on dark bg
  const [R, G, B] = hslToRgb(h, s, l);
  return `#${[R, G, B].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

/** Lightens a hex color by a factor (for the --gold-b highlight). */
export function lighten(hex: string, amt = 0.15): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  const f = (v: number) => Math.round(Math.min(255, v + (255 - v) * amt)).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
