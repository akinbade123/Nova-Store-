import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SmartImage } from '../ui/SmartImage';
import { imageUrl } from '../../utils/image';
import { cn } from '../../utils/cn';

const RATIO = 5 / 4;
const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Slide that magnifies under the cursor on pointer devices. */
function ZoomSlide({ image, alt, priority, label }) {
  const [zoom, setZoom] = useState(null); // { x, y } in % while zoomed

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      className="relative h-full w-full shrink-0 snap-center overflow-hidden can-hover:cursor-zoom-in"
      onMouseMove={(event) => canHover() && handleMove(event)}
      onMouseLeave={() => setZoom(null)}
    >
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out-soft"
        style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
      >
        <SmartImage
          src={image.src}
          zoom={image.zoom}
          x={image.x}
          y={image.y}
          alt={alt}
          ratio={RATIO}
          priority={priority}
          sizes="(min-width: 1024px) 52vw, 100vw"
          widths={[480, 720, 960, 1280, 1600]}
        />
      </div>
    </div>
  );
}

export function ProductGallery({ images, name, children }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  const goTo = useCallback((index) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(images.length - 1, index));
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    setActive(next);
  }, [images.length]);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  };

  // Keep the current slide aligned when the viewport resizes.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const observer = new ResizeObserver(() => {
      track.scrollTo({ left: active * track.clientWidth });
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [active]);

  return (
    <div className="lg:grid lg:grid-cols-[76px_1fr] lg:gap-4 xl:grid-cols-[88px_1fr] xl:gap-5">
      {/* Main image */}
      <div
        className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface max-sm:rounded-none lg:order-2 lg:rounded-3xl"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${name} images`}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') goTo(active + 1);
          if (event.key === 'ArrowLeft') goTo(active - 1);
        }}
      >
        <div
          ref={trackRef}
          onScroll={handleScroll}
          tabIndex={0}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {images.map((image, index) => (
            <ZoomSlide
              key={index}
              image={image}
              alt={index === 0 ? name : `${name} — detail ${index}`}
              label={`${index + 1} of ${images.length}`}
              priority={index === 0}
            />
          ))}
        </div>

        {children /* badges / wishlist overlay */}

        {images.length > 1 && (
          <>
            {[
              { dir: -1, Icon: ChevronLeft, label: 'Previous image', side: 'left-4', disabled: active === 0 },
              { dir: 1, Icon: ChevronRight, label: 'Next image', side: 'right-4', disabled: active === images.length - 1 },
            ].map(({ dir, Icon, label, side, disabled }) => (
              <button
                key={dir}
                type="button"
                onClick={() => goTo(active + dir)}
                disabled={disabled}
                aria-label={label}
                className={cn(
                  'absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-soft backdrop-blur transition-opacity duration-200',
                  'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 disabled:!opacity-0 can-hover:flex',
                  side,
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </button>
            ))}
            <p className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium tabular-nums shadow-soft backdrop-blur lg:hidden">
              {active + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <ul className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto max-sm:px-4 lg:order-1 lg:mt-0 lg:flex-col lg:gap-3 lg:overflow-visible" aria-label="Choose image">
          {images.map((image, index) => (
            <li key={index} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={active === index}
                className={cn(
                  'block aspect-[4/5] w-16 overflow-hidden rounded-xl bg-surface transition-[box-shadow,opacity] duration-200 sm:w-[72px] lg:w-full',
                  active === index ? 'ring-2 ring-ink ring-offset-2' : 'opacity-70 hover:opacity-100',
                )}
              >
                <img
                  src={imageUrl(image.src, { w: 176, h: 220, zoom: image.zoom, x: image.x, y: image.y })}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
