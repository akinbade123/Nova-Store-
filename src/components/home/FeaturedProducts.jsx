import { useState } from 'react';
import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';
import { ProductCard, ProductCardSkeleton } from '../product/ProductCard';
import { productService } from '../../services/productService';
import { useAsync } from '../../hooks/useAsync';
import { categories } from '../../data/categories';
import { cn } from '../../utils/cn';

const tabs = [{ slug: 'all', name: 'All' }, ...categories];

export function FeaturedProducts() {
  const [active, setActive] = useState('all');
  const { data, loading, error, retry } = useAsync(
    () =>
      active === 'all'
        ? productService.list({ featured: true, limit: 8 })
        : productService.list({ category: active, sort: 'popular', limit: 8 }),
    [active],
  );

  return (
    <section aria-labelledby="featured-heading" className="pb-16 lg:pb-24">
      <Container>
        <SectionHeader
          id="featured-heading"
          eyebrow="Curated for you"
          title="Featured products"
          description="Our most-loved pieces this month, chosen by the NOVA team."
          action={{ label: 'View all products', to: '/shop' }}
        />

        <div
          role="tablist"
          aria-label="Filter featured products by category"
          className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {tabs.map((tab) => (
            <button
              key={tab.slug}
              type="button"
              role="tab"
              aria-selected={active === tab.slug}
              aria-controls="featured-panel"
              onClick={() => setActive(tab.slug)}
              className={cn(
<<<<<<< HEAD
                'h-10 shrink-0 rounded-md px-5 text-[13px] font-medium transition-colors duration-200',
=======
                'h-10 shrink-0 rounded-full px-5 text-caption font-medium transition-colors duration-200',
>>>>>>> 2ee02a475115790a889c400c3730454a436cc71e
                active === tab.slug
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink ring-1 ring-inset ring-line-strong hover:ring-ink',
              )}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div id="featured-panel" role="tabpanel" aria-busy={loading}>
          {error ? (
            <ErrorState message={error.userMessage ?? 'We couldn’t load these products.'} onRetry={retry} />
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10 xl:grid-cols-5">
              {loading
                ? Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)
                : data.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center lg:hidden">
          <Button to="/shop" variant="secondary" size="lg">
            View all products
          </Button>
        </div>
      </Container>
    </section>
  );
}
