import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ChevronDown, ThumbsUp } from 'lucide-react';
import { Rating } from '../ui/Rating';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { productService } from '../../services/productService';
import { formatDate } from '../../utils/format';
import { cn } from '../../utils/cn';

const SORTS = {
  recent: { label: 'Most recent', fn: (a, b) => new Date(b.date) - new Date(a.date) },
  helpful: { label: 'Most helpful', fn: (a, b) => b.helpful - a.helpful },
  highest: { label: 'Highest rated', fn: (a, b) => b.rating - a.rating },
  lowest: { label: 'Lowest rated', fn: (a, b) => a.rating - b.rating },
};

function ReviewItem({ review }) {
  const [voted, setVoted] = useState(false);
  return (
    <article className="border-b border-line py-7 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <Rating value={review.rating} />
        <time dateTime={review.date} className="shrink-0 text-caption text-muted">
          {formatDate(review.date)}
        </time>
      </div>
      <h3 className="mt-3 font-sans text-body font-semibold tracking-normal">{review.title}</h3>
      <p className="mt-2 text-body leading-relaxed text-ink/75">{review.body}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted">
          <span className="font-medium text-ink">{review.name}</span>
          <span aria-hidden="true">·</span>
          <span>{review.location}</span>
          {review.verified && (
            <span className="inline-flex items-center gap-1 text-success">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              Verified buyer
            </span>
          )}
          {review.variant && (
            <>
              <span aria-hidden="true">·</span>
              <span>{review.variant}</span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setVoted((value) => !value)}
          aria-pressed={voted}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-caption ring-1 ring-inset transition-colors',
            voted ? 'bg-ink text-white ring-ink' : 'text-muted ring-line-strong hover:text-ink hover:ring-ink',
          )}
        >
          <ThumbsUp className="size-3.5" aria-hidden="true" />
          Helpful ({review.helpful + (voted ? 1 : 0)})
        </button>
      </div>
    </article>
  );
}

export function ProductReviews({ product }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, loading, error, retry } = useAsync(() => productService.reviews(product), [product.id]);
  const [sort, setSort] = useState('recent');
  const [starFilter, setStarFilter] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const reviews = useMemo(() => {
    if (!data) return [];
    const list = starFilter ? data.items.filter((item) => item.rating === starFilter) : data.items;
    return [...list].sort(SORTS[sort].fn);
  }, [data, sort, starFilter]);

  const visible = expanded ? reviews : reviews.slice(0, 4);
  const max = data ? Math.max(...data.breakdown.map((row) => row.count)) : 1;

  const writeReview = () =>
    toast({
      variant: 'info',
      title: 'Sign in to write a review',
      description: 'Only verified buyers can leave reviews.',
      action: { label: 'Sign in', onClick: () => navigate('/login') },
    });

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24">
      <div className="grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-16">
        {/* Summary */}
        <div>
          <h2 id="reviews-title" className="text-heading font-semibold leading-tight sm:text-3xl">
            Customer reviews
          </h2>
          <div className="mt-6 flex items-center gap-4">
            <p className="font-display text-6xl font-bold tracking-tight">{product.rating.toFixed(1)}</p>
            <div>
              <Rating value={product.rating} size="md" />
              <p className="mt-1.5 text-caption text-muted">Based on {product.reviewCount.toLocaleString()} reviews</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-7 space-y-3">
              {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : (
            data && (
              <ul className="mt-7 space-y-2" aria-label="Filter reviews by star rating">
                {data.breakdown.map((row) => {
                  const active = starFilter === row.stars;
                  return (
                    <li key={row.stars}>
                      <button
                        type="button"
                        onClick={() => {
                          setStarFilter(active ? null : row.stars);
                          setExpanded(false);
                        }}
                        aria-pressed={active}
                        className={cn(
                          'grid w-full grid-cols-[44px_1fr_52px] items-center gap-3 rounded-lg px-2 py-1.5 text-caption transition-colors',
                          active ? 'bg-surface' : 'hover:bg-surface',
                        )}
                      >
                        <span className="text-left font-medium">{row.stars} star</span>
                        <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                          <span className="block h-full rounded-full bg-star" style={{ width: `${(row.count / max) * 100}%` }} />
                        </span>
                        <span className="text-right tabular-nums text-muted">{row.count.toLocaleString()}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          <Button variant="secondary" size="lg" fullWidth className="mt-8" onClick={writeReview}>
            Write a review
          </Button>
        </div>

        {/* List */}
        <div>
          <div className="mb-7 flex items-center justify-between gap-4 border-b border-line pb-4">
            <p className="text-sm text-muted" aria-live="polite">
              {loading ? 'Loading reviews…' : `Showing ${visible.length} of ${reviews.length} recent reviews`}
              {starFilter && (
                <button type="button" onClick={() => setStarFilter(null)} className="ml-2 font-medium text-ink underline underline-offset-4">
                  Clear {starFilter}-star filter
                </button>
              )}
            </p>
            <label className="relative inline-flex shrink-0 items-center">
              <span className="sr-only">Sort reviews</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-9 cursor-pointer appearance-none rounded-md bg-white pl-4 pr-9 text-caption font-medium ring-1 ring-inset ring-line-strong outline-none hover:ring-ink focus-visible:ring-2 focus-visible:ring-ink"
              >
                {Object.entries(SORTS).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted" aria-hidden="true" />
            </label>
          </div>

          {error ? (
            <ErrorState message="We couldn’t load reviews right now." onRetry={retry} />
          ) : loading ? (
            <div className="space-y-8">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <p className="rounded-2xl bg-surface px-6 py-12 text-center text-sm text-muted">
              No {starFilter}-star reviews yet.
            </p>
          ) : (
            <>
              {visible.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
              {reviews.length > visible.length && (
                <Button variant="secondary" className="mt-8" onClick={() => setExpanded(true)}>
                  Show more reviews
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
