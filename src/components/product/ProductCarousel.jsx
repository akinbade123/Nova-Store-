import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { cn } from '../../utils/cn';

const slideClass = 'w-[58%] shrink-0 snap-start sm:w-[36%] md:w-[26%] lg:w-[23%] xl:w-[calc((100%-6rem)/5)]';

/** Horizontal product rail with native scroll-snap, swipe and arrow controls. */
export function ProductCarousel({ products, loading, label, renderHeader }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setEdges({
      start: track.scrollLeft <= 4,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    const track = trackRef.current;
    if (!track) return undefined;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    return () => observer.disconnect();
  }, [updateEdges, products, loading]);

  const scrollBy = (direction) => {
    const track = trackRef.current;
    const slide = track?.firstElementChild;
    if (!track || !slide) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const perView = Math.max(1, Math.floor((track.clientWidth + gap) / (slide.offsetWidth + gap)));
    track.scrollBy({ left: direction * perView * (slide.offsetWidth + gap), behavior: 'smooth' });
  };

  const controls = (
    <div className="flex items-center gap-2">
      {[
        { dir: -1, Icon: ChevronLeft, label: 'Previous products', disabled: edges.start },
        { dir: 1, Icon: ChevronRight, label: 'Next products', disabled: edges.end },
      ].map(({ dir, Icon, label: ariaLabel, disabled }) => (
        <button
          key={dir}
          type="button"
          onClick={() => scrollBy(dir)}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'inline-flex size-11 items-center justify-center rounded-md ring-1 ring-inset ring-line-strong transition-colors duration-200',
            'hover:bg-ink hover:text-white hover:ring-ink disabled:pointer-events-none disabled:opacity-35',
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {renderHeader ? renderHeader(controls) : <div className="mb-6 flex justify-end">{controls}</div>}
      <div
        ref={trackRef}
        onScroll={updateEdges}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:gap-6 lg:px-0"
      >
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={slideClass}>
                <ProductCardSkeleton />
              </div>
            ))
          : products.map((product, index) => (
              <div
                key={product.id}
                className={slideClass}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${products.length}`}
              >
                <ProductCard product={product} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 31vw, 70vw" />
              </div>
            ))}
      </div>
    </div>
  );
}
