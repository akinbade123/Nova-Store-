import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import { imageSrcSet, imageUrl } from '../../utils/image';

/**
 * Image with a shimmer placeholder while loading and a graceful fallback on error.
 * Expects to fill a positioned parent that controls aspect ratio.
 */
export function SmartImage({ src, alt, ratio, zoom, x, y, sizes = '100vw', widths, priority = false, className, imgClassName }) {
  const [status, setStatus] = useState('loading');

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {status === 'loading' && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface text-subtle">
          <ImageOff className="size-6" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-xs">Image unavailable</span>
        </div>
      ) : (
        <img
          src={imageUrl(src, { w: 900, h: ratio ? Math.round(900 * ratio) : undefined, zoom, x, y })}
          srcSet={imageSrcSet(src, { ratio, zoom, x, y, widths })}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={cn(
            'size-full object-cover',
            // Priority images are the page's main content (and its LCP): show them as soon as they
            // arrive. Fading in from transparent would hold back the paint until React has handled
            // onLoad and the fade has started, which on a slow phone adds about half a second.
            !priority && 'transition-opacity duration-500',
            !priority && (status === 'loaded' ? 'opacity-100' : 'opacity-0'),
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
