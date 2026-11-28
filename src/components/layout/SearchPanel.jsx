import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { productService } from '../../services/productService';
import { USE_MOCK_DATA } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { categories } from '../../data/categories';
import { imageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/format';

const popularSearches = ['Headphones', 'Hoodie', 'Sneaker', 'Sofa', 'Backpack', 'Watch'];

export function SearchPanel() {
  const { isSearchOpen, close } = useUI();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  // Wait for a pause in typing before asking the API, so each keystroke isn't a request.
  const [deferredQuery, setDeferredQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDeferredQuery(query), USE_MOCK_DATA ? 0 : 200);
    return () => clearTimeout(timer);
  }, [query]);
  const { data } = useAsync(() => productService.search(deferredQuery, 5), [deferredQuery]);
  const results = data ?? [];

  useLockBodyScroll(isSearchOpen);
  useEscapeKey(isSearchOpen, close);

  useEffect(() => {
    if (isSearchOpen) requestAnimationFrame(() => inputRef.current?.focus());
    else setQuery('');
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const submit = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    close();
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Search products">
      <div className="absolute inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]" onClick={close} aria-hidden="true" />
      <div className="relative max-h-dvh animate-slide-down overflow-y-auto bg-white shadow-lift">
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6">
          <form onSubmit={submit} role="search" className="flex items-center gap-2">
            <label className="flex h-14 flex-1 items-center gap-3 rounded-md bg-surface px-5 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-ink">
              <Search className="size-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
              <span className="sr-only">Search NOVA</span>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, categories…"
                className="h-full w-full bg-transparent text-base outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
                autoComplete="off"
                enterKeyHint="search"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-line-strong/70 text-ink hover:bg-line-strong"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={close}
              className="h-11 shrink-0 rounded-md px-3 text-sm font-medium text-ink hover:bg-surface"
            >
              Cancel
            </button>
          </form>

          {!deferredQuery.trim() ? (
            <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="mb-3 eyebrow text-muted">Popular searches</p>
                <ul className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => setQuery(term)}
<<<<<<< HEAD
                        className="h-9 rounded-md px-4 text-[13px] font-medium ring-1 ring-inset ring-line-strong transition-colors hover:bg-ink hover:text-white hover:ring-ink"
=======
                        className="h-9 rounded-full px-4 text-caption font-medium ring-1 ring-inset ring-line-strong transition-colors hover:bg-ink hover:text-white hover:ring-ink"
>>>>>>> 2ee02a475115790a889c400c3730454a436cc71e
                      >
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 eyebrow text-muted">Shop by category</p>
                <ul className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        to={`/shop?category=${category.slug}`}
                        onClick={close}
                        className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface"
                      >
                        <img
                          src={imageUrl(category.image, { w: 96, h: 96 })}
                          alt=""
                          className="size-11 rounded-lg bg-surface object-cover"
                        />
                        <span className="text-sm font-medium">{category.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-6" aria-live="polite">
              {results.length > 0 ? (
                <>
                  <p className="mb-2 px-2 eyebrow text-muted">Products</p>
                  <ul className="divide-y divide-line">
                    {results.map((product) => (
                      <li key={product.id}>
                        <Link
                          to={`/product/${product.slug}`}
                          onClick={close}
                          className="flex items-center gap-4 rounded-xl p-2 transition-colors hover:bg-surface"
                        >
                          <img
                            src={imageUrl(product.images[0].src, { w: 112, h: 140 })}
                            alt=""
                            className="h-[70px] w-14 shrink-0 rounded-lg bg-surface object-cover"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{product.name}</span>
                            <span className="mt-0.5 block text-caption text-muted">{formatPrice(product.price)}</span>
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-subtle" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={submit}
                    className="mt-4 inline-flex items-center gap-1.5 px-2 text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    View all results for “{deferredQuery.trim()}”
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <div className="px-2 py-10 text-center">
                  <p className="font-display text-lg font-semibold">No results for “{deferredQuery.trim()}”</p>
                  <p className="mt-1.5 text-sm text-muted">Check the spelling or try a broader term like “headphones”.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
