import { BadgeCheck } from 'lucide-react';
import { Container } from '../ui/Container';
import { Rating } from '../ui/Rating';
import { Skeleton } from '../ui/Skeleton';
import { productService } from '../../services/productService';
import { useAsync } from '../../hooks/useAsync';
import { imageUrl } from '../../utils/image';

const cardWidth = 'w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto';

function TestimonialCard({ review }) {
  return (
    <figure className={`${cardWidth} flex flex-col rounded-2xl bg-white p-6 ring-1 ring-line sm:p-7`}>
      <Rating value={review.rating} size="md" />
      <p className="mt-5 font-display text-lg font-semibold leading-snug tracking-[-0.01em]">“{review.title}”</p>
      <blockquote className="mt-3 flex-1 text-body leading-relaxed text-ink/75">
        <p>{review.quote}</p>
      </blockquote>
      <figcaption className="mt-7 flex items-center gap-3 border-t border-line pt-5">
        <img
          src={imageUrl(review.avatar, { w: 96, h: 96 })}
          alt=""
          loading="lazy"
          className="size-11 shrink-0 rounded-full bg-surface object-cover"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {review.name}
            <BadgeCheck className="size-4 text-accent" strokeWidth={1.75} aria-label="Verified buyer" />
          </p>
          <p className="truncate text-caption text-muted">
            {review.location} · Bought {review.product}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

function TestimonialSkeleton() {
  return (
    <div className={`${cardWidth} rounded-2xl p-6 ring-1 ring-line sm:p-7`} aria-hidden="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-5 h-5 w-4/5" />
      <Skeleton className="mt-4 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-2/3" />
      <div className="mt-8 flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    </div>
  );
}

export function Testimonials() {
  const { data, loading } = useAsync(() => productService.testimonials());

  if (!loading && !data?.length) return null;

  return (
    <section aria-labelledby="reviews-heading" className="py-16 lg:py-24">
      <Container>
        <div className="mb-10 flex flex-col gap-6 sm:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="mb-3 eyebrow text-muted">Customer reviews</p>
            <h2 id="reviews-heading" className="text-heading font-semibold leading-[1.1] sm:text-4xl">
              Loved by 120,000+ customers
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-display text-5xl font-bold tracking-tight">4.9</p>
            <div>
              <Rating value={4.9} size="md" />
              <p className="mt-1 text-caption text-muted">Based on 12,480 verified reviews</p>
            </div>
          </div>
        </div>

        <div
          // Scrolls sideways on phones, so keyboard users need to be able to focus it to scroll.
          tabIndex={0}
          role="region"
          aria-label="Customer reviews"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }, (_, i) => <TestimonialSkeleton key={i} />)
            : data.map((review) => <TestimonialCard key={review.id} review={review} />)}
        </div>
      </Container>
    </section>
  );
}
