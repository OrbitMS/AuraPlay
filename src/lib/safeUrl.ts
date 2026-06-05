/**
 * Returns the URL only if it uses a safe scheme for an <img src>, otherwise "".
 * Blocks anything exotic (e.g. javascript:) from reaching a DOM sink while
 * passing every legitimate source: https/http thumbnails & radio favicons,
 * data:/blob: images, and Tauri's offline-asset URLs (asset:// / asset.localhost).
 */
export function safeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const u = url.trim();
  if (/^(https?:|data:image\/|blob:|asset:|tauri:)/i.test(u)) return u;
  if (u.includes('asset.localhost')) return u; // convertFileSrc() on Windows
  return '';
}
