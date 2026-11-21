import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { SmartImage } from '../components/ui/SmartImage';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import { SortSelect } from '../components/shop/SortSelect';
import { collections } from '../data/collections';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { productService } from '../services/productService';
import { imageUrl } from '../utils/image';

export default function CollectionPage() {
  const { slug } = useParams();
  // "featured" in the shared sort control means the curated order here.
  const [sort, setSort] = useState('featured');
  const { data, loading, error, retry } = useAsync(
    () => productService.collection(slug, { sort: sort === 'featured' ? 'curated' : sort }),
    [slug, sort],
  );
  const current = data?.collection.slug === slug ? data : null;
  const collection = current?.collection;
  useDocumentTitle(collection?.name ?? 'Collection');

  if (error) {
    return (
      <Container className="py-16">
        <ErrorState message="We couldn’t load this collection." onRetry={retry} />
      </Container>
    );
  }

  if (!loading && !data) {
    return (
      <Container className="py-16 lg:py-24">
        <EmptyState
          icon={LayoutGrid}
          title="That collection has ended"
          message="It may have been a limited edit. Take a look at what’s current instead."
          action={{ label: 'View all collections', to: '/collections' }}
        />
      </Container>
    );
  }

  const others = collections.filter((item) => item.slug !== slug).slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="pt-3 sm:pt-4 lg:pt-6">
        <Container className="px-3 sm:px-6 lg:px-10">
          <div className="relative isolate flex min-h-[420px] items-end overflow-hidden rounded-[24px] bg-ink sm:min-h-[460px] lg:min-h-[520px] lg:rounded-[32px]">
            {collection ? (
              <>
                <SmartImage
                  src={collection.image}
                  alt=""
                  priority
                  sizes="(min-width: 1440px) 1400px, 100vw"
                  widths={[640, 960, 1280, 1600, 2000]}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 lg:bg-gradient-to-r lg:from-black/75 lg:via-black/30 lg:to-transparent" aria-hidden="true" />
                <div className="relative z-10 max-w-2xl px-6 pb-8 text-white sm:px-10 sm:pb-12 lg:px-16 lg:pb-16">
                  <Breadcrumbs
                    items={[{ label: 'Home', to: '/' }, { label: 'Collections', to: '/collections' }, { label: collection.name }]}
                    className="mb-6 [&_a:hover]:text-white [&_a]:text-white/70 [&_span]:text-white/90 [&_svg]:text-white/50"
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{collection.eyebrow}</p>
                  <h1 className="mt-3 text-[38px] font-bold leading-[1.02] tracking-tight text-white sm:text-6xl">{collection.name}</h1>
                  <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/80 sm:text-base">{collection.description}</p>
                </div>
              </>
            ) : (
              <div className="relative z-10 w-full max-w-2xl space-y-4 px-6 pb-10 sm:px-10 lg:px-16 lg:pb-16" aria-busy="true">
                <div className="h-3 w-24 animate-pulse rounded bg-white/15" />
                <div className="h-14 w-3/4 animate-pulse rounded-lg bg-white/15" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/15" />
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Products */}
      <Container className="pb-20 pt-10 lg:pb-28 lg:pt-14">
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="text-sm text-muted" aria-live="polite">
            {current ? `${current.products.length} products` : 'Loading products…'}
          </p>
          <SortSelect value={sort} onChange={setSort} className="w-[210px] sm:w-[240px]" />
        </div>

        <div
          aria-busy={loading}
          className={`grid grid-cols-2 gap-x-3 gap-y-10 transition-opacity duration-300 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14 ${loading && current ? 'opacity-50' : ''}`}
        >
          {current
            ? current.products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)
            : Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
        </div>

        {/* More collections */}
        <section aria-labelledby="more-collections" className="mt-20 border-t border-line pt-14 lg:mt-28 lg:pt-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 id="more-collections" className="text-[28px] font-semibold leading-tight sm:text-4xl">
              More collections
            </h2>
            <Link to="/collections" className="group hidden items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline sm:inline-flex">
              View all
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3 lg:gap-6">
            {others.map((item) => (
              <li key={item.slug}>
                <Link to={`/collections/${item.slug}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-surface">
                    <img
                      src={imageUrl(item.image, { w: 640, h: 480 })}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{item.eyebrow}</p>
                  <p className="mt-1.5 font-display text-xl font-semibold underline-offset-4 group-hover:underline">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">{item.tagline}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
