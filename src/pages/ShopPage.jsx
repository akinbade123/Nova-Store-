import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { ErrorState } from '../components/ui/ErrorState';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import { FilterPanel } from '../components/shop/FilterPanel';
import { SortSelect } from '../components/shop/SortSelect';
import { ActiveFilters } from '../components/shop/ActiveFilters';
import { useShopFilters } from '../hooks/useShopFilters';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { productService } from '../services/productService';
import { categories } from '../data/categories';
import { cn } from '../utils/cn';

const PAGE_SIZE = 12;

function useHeading(filters) {
  if (filters.q) return { title: `Results for “${filters.q}”`, description: null, crumb: 'Search' };
  if (filters.categories.length === 1) {
    const category = categories.find((item) => item.slug === filters.categories[0]);
    if (category) return { title: category.name, description: category.tagline, crumb: category.name };
  }
  if (filters.onSale || filters.sort === 'discount') {
    return { title: 'Sale', description: 'Limited-time prices on pieces we love.', crumb: 'Sale' };
  }
  return {
    title: 'Shop all',
    description: 'Electronics, fashion, accessories and home goods — chosen for quality and made to last.',
    crumb: null,
  };
}

/** In-page search box that writes to the URL after a short pause. */
function ShopSearch({ value, onSearch, className }) {
  const [term, setTerm] = useState(value);
  const timer = useRef();

  useEffect(() => setTerm(value), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (event) => {
    const next = event.target.value;
    setTerm(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next.trim()), 350);
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        onSearch(term.trim());
      }}
      className={className}
    >
      <label className="flex h-11 items-center gap-2.5 rounded-md bg-surface px-4 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-ink">
        <Search className="size-[18px] shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
        <span className="sr-only">Search products</span>
        <input
          type="search"
          value={term}
          onChange={handleChange}
          placeholder="Search products"
          className="h-full w-full bg-transparent text-sm outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
          enterKeyHint="search"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              onSearch('');
            }}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-line-strong/70 hover:bg-line-strong"
            aria-label="Clear search"
          >
            <X className="size-3" />
          </button>
        )}
      </label>
    </form>
  );
}

export default function ShopPage() {
  const { filters, update, clearFilters, activeCount, key } = useShopFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Pagination is tied to the filter set: changing any filter starts again at page one.
  const [pagination, setPagination] = useState({ key, offset: 0 });
  const offset = pagination.key === key ? pagination.offset : 0;

  const { data, loading, error, retry } = useAsync(
    () =>
      productService.query({ ...filters, limit: PAGE_SIZE, offset }).then((result) => ({
        ...result,
        key,
        // "Load more" fetches only the next page and adds it to what's already shown.
        items: offset && data?.key === key ? [...data.items, ...result.items] : result.items,
      })),
    [key, offset],
  );

  const heading = useHeading(filters);
  useDocumentTitle(heading.title);

  const firstLoad = loading && !data;
  // Results from a previous filter set are stale even before the new request starts.
  const refreshing = Boolean(data) && data.key !== key && !error;
  const loadingMore = loading && data?.key === key;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = items.length < total;
  const hasAnyFilter = activeCount > 0 || Boolean(filters.q);

  const resetAll = () => clearFilters({ q: '' });

  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, ...(heading.crumb ? [{ label: heading.crumb }] : [])];

  return (
    <div className="pb-20 lg:pb-28">
      <Container>
        {/* Header */}
        <header className="pb-6 pt-6 lg:pb-8 lg:pt-10">
          <Breadcrumbs items={crumbs} />
          <div className="mt-6 flex flex-col gap-6 lg:mt-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-title font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">{heading.title}</h1>
              {heading.description && <p className="mt-3 text-body leading-relaxed text-muted">{heading.description}</p>}
            </div>
            <ShopSearch
              value={filters.q}
              onSearch={(q) => update({ q }, { replace: true })}
              className="w-full lg:w-[340px]"
            />
          </div>

          {/* Category shortcuts — touch & tablet, where the sidebar is hidden */}
          <nav aria-label="Categories" className="no-scrollbar -mx-4 mt-6 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:hidden">
            <ul className="flex gap-2">
              {[{ slug: null, name: 'All' }, ...categories].map((category) => {
                const active = category.slug
                  ? filters.categories.length === 1 && filters.categories[0] === category.slug
                  : filters.categories.length === 0;
                return (
                  <li key={category.name}>
                    <button
                      type="button"
                      onClick={() => update({ categories: category.slug ? [category.slug] : [] })}
                      aria-pressed={active}
                      className={cn(
                        'h-9 shrink-0 whitespace-nowrap rounded-md px-4 text-caption font-medium transition-colors',
                        active ? 'bg-ink text-white' : 'ring-1 ring-inset ring-line-strong',
                      )}
                    >
                      {category.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>
      </Container>

      {/* Toolbar — sticks under the navbar on small screens */}
      <div className="sticky top-16 z-30 border-y border-line bg-white/90 backdrop-blur-xl lg:static lg:border-b-0 lg:bg-white">
        <Container className="flex h-14 items-center justify-between gap-3 lg:h-16">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-caption font-medium ring-1 ring-inset ring-line-strong hover:ring-ink lg:hidden"
            >
              <SlidersHorizontal className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Filters
              {activeCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-ink text-2xs font-semibold text-white">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSidebarVisible((value) => !value)}
              aria-expanded={sidebarVisible}
              aria-controls="shop-filters"
              className="hidden h-10 items-center gap-2 rounded-md pr-2 text-sm font-medium hover:text-ink lg:inline-flex"
            >
              {sidebarVisible ? (
                <PanelLeftClose className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              )}
              {sidebarVisible ? 'Hide filters' : 'Show filters'}
            </button>
            <p className="hidden text-sm text-muted sm:block" aria-live="polite">
              {firstLoad ? 'Loading products…' : `${total} ${total === 1 ? 'product' : 'products'}`}
            </p>
          </div>
          <SortSelect value={filters.sort} onChange={(sort) => update({ sort })} className="w-[210px] sm:w-[240px]" />
        </Container>
      </div>

      <Container className="pt-5 lg:pt-2">
        <div className={cn('lg:grid lg:gap-10 xl:gap-14', sidebarVisible ? 'lg:grid-cols-[248px_1fr]' : 'lg:grid-cols-1')}>
          {/* Desktop sidebar */}
          {sidebarVisible && (
            <aside id="shop-filters" aria-label="Product filters" className="hidden lg:block">
              <div className="no-scrollbar sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pb-6 pt-4">
                <FilterPanel filters={filters} update={update} facets={data?.facets} />
              </div>
            </aside>
          )}

          <section aria-label="Products" className="min-w-0 lg:pt-4">
            <p className="mb-4 text-caption text-muted sm:hidden" aria-hidden="true">
              {firstLoad ? 'Loading…' : `${total} ${total === 1 ? 'product' : 'products'}`}
            </p>

            {hasAnyFilter && (
              <div className="mb-6">
                <ActiveFilters filters={filters} update={update} clearFilters={clearFilters} />
              </div>
            )}

            {error ? (
              <ErrorState message={error.userMessage ?? 'We couldn’t load products right now.'} onRetry={retry} />
            ) : firstLoad ? (
              <ProductGrid wide={!sidebarVisible}>
                {Array.from({ length: 9 }, (_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </ProductGrid>
            ) : !refreshing && total === 0 ? (
              <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-20 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-white">
                  <SearchX className="size-7" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-semibold">No products match</h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                  {filters.q
                    ? `We couldn’t find anything for “${filters.q}” with these filters. Try a different term or remove a filter.`
                    : 'Try removing a filter or widening your price range.'}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={resetAll}>Clear all filters</Button>
                  <Button to="/" variant="secondary">
                    Back to home
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  aria-busy={refreshing}
                  className={cn('transition-opacity duration-300', refreshing && 'pointer-events-none opacity-50')}
                >
                  <ProductGrid wide={!sidebarVisible}>
                    {items.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        priority={index < 3}
                        sizes={
                          sidebarVisible
                            ? '(min-width: 1280px) 26vw, (min-width: 768px) 30vw, 46vw'
                            : '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw'
                        }
                      />
                    ))}
                    {loadingMore && Array.from({ length: Math.min(PAGE_SIZE, total - items.length) }, (_, i) => <ProductCardSkeleton key={`more-${i}`} />)}
                  </ProductGrid>
                </div>

                {/* Pagination */}
                {total > 0 && (
                  <div className="mt-14 flex flex-col items-center text-center">
                    <p className="text-sm text-muted" aria-live="polite">
                      Showing <span className="font-medium text-ink">{items.length}</span> of {total} products
                    </p>
                    <div className="mt-3 h-[3px] w-48 overflow-hidden rounded-full bg-line" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out-soft"
                        style={{ width: `${(items.length / total) * 100}%` }}
                      />
                    </div>
                    {hasMore ? (
                      <Button
                        variant="secondary"
                        size="lg"
                        className="mt-6 min-w-[200px]"
                        loading={loadingMore}
                        onClick={() => setPagination({ key, offset: items.length })}
                      >
                        Load more
                      </Button>
                    ) : (
                      total > PAGE_SIZE && (
                        <p className="mt-6 text-sm text-muted">
                          You’ve seen it all.{' '}
                          <Link to="/collections" className="font-medium text-ink underline underline-offset-4">
                            Explore collections
                          </Link>
                        </p>
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </Container>

      {/* Mobile & tablet filter drawer */}
      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        headerExtra={activeCount > 0 && <span className="text-sm text-muted">({activeCount})</span>}
        className="max-w-full sm:max-w-[420px]"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => clearFilters()} disabled={activeCount === 0}>
              Clear all
            </Button>
            <Button size="lg" className="flex-[1.6]" onClick={() => setFiltersOpen(false)} loading={refreshing}>
              Show {total} {total === 1 ? 'result' : 'results'}
            </Button>
          </div>
        }
      >
        <div className="px-5 py-6 sm:px-6">
          <div className="mb-6 border-b border-line pb-6">
            <p className="mb-3 text-sm font-semibold">Sort by</p>
            <SortSelect value={filters.sort} onChange={(sort) => update({ sort })} className="w-full" />
          </div>
          <FilterPanel filters={filters} update={update} facets={data?.facets} />
        </div>
      </Sheet>
    </div>
  );
}

function ProductGrid({ wide, children }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:gap-x-5 lg:gap-y-10 xl:grid-cols-4',
        wide && 'lg:grid-cols-4 xl:grid-cols-5',
      )}
    >
      {children}
    </div>
  );
}
