const UNSPLASH = 'https://images.unsplash.com/photo-';

/**
 * Build a sized image URL. Sample data stores Unsplash photo ids;
 * once a CDN or backend is connected, full URLs pass through untouched.
 * `zoom` with optional `x`/`y` (0–1) crops around a focal point — used for detail shots.
 */
export function imageUrl(src, { w = 800, h, zoom, x = 0.5, y = 0.5 } = {}) {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('/')) return src;

  const params = new URLSearchParams({ auto: 'format', fit: 'crop', q: '80', w: String(w) });
  if (h) params.set('h', String(h));
  if (zoom) {
    params.set('crop', 'focalpoint');
    params.set('fp-x', String(x));
    params.set('fp-y', String(y));
    params.set('fp-z', String(zoom));
  }
  return `${UNSPLASH}${src}?${params}`;
}

/** Responsive srcset at a fixed aspect ratio (height / width). */
export function imageSrcSet(src, { widths = [400, 640, 900, 1200], ratio, zoom, x, y } = {}) {
  if (!src || src.startsWith('http') || src.startsWith('/')) return undefined;
  return widths
    .map((w) => `${imageUrl(src, { w, h: ratio ? Math.round(w * ratio) : undefined, zoom, x, y })} ${w}w`)
    .join(', ');
}
