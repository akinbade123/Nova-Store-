import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'discount', label: 'Biggest discount' },
];

export const PRICE_RANGES = [
  { label: 'Under $50', min: null, max: 50 },
  { label: '$50 – $150', min: 50, max: 150 },
  { label: '$150 – $500', min: 150, max: 500 },
  { label: '$500 & above', min: 500, max: null },
];

export const RATING_OPTIONS = [4.5, 4, 3];

/* Filter field -> URL parameter. Short, readable URLs that are safe to share. */
const PARAM = {
  q: 'q',
  categories: 'category',
  minPrice: 'min',
  maxPrice: 'max',
  minRating: 'rating',
  inStock: 'stock',
  onSale: 'sale',
  sort: 'sort',
};

const toNumber = (value) => {
  if (value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

/** Shop filters stored in the URL query string — shareable, bookmarkable and back-button friendly. */
export function useShopFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const sort = params.get(PARAM.sort);
    return {
      q: params.get(PARAM.q) ?? '',
      categories: params.get(PARAM.categories)?.split(',').filter(Boolean) ?? [],
      minPrice: toNumber(params.get(PARAM.minPrice)),
      maxPrice: toNumber(params.get(PARAM.maxPrice)),
      minRating: toNumber(params.get(PARAM.minRating)),
      inStock: params.get(PARAM.inStock) === '1',
      onSale: params.get(PARAM.onSale) === '1',
      sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : 'featured',
    };
  }, [params]);

  /** Merge a partial filter object into the URL. `replace` avoids history spam while typing. */
  const update = useCallback(
    (patch, { replace = false } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([field, value]) => {
            const key = PARAM[field];
            if (!key) return;
            const empty =
              value === null || value === undefined || value === '' || value === false ||
              (Array.isArray(value) && value.length === 0) || (field === 'sort' && value === 'featured');
            if (empty) next.delete(key);
            else if (Array.isArray(value)) next.set(key, value.join(','));
            else if (value === true) next.set(key, '1');
            else next.set(key, String(value).trim());
          });
          return next;
        },
        { replace, preventScrollReset: true },
      );
    },
    [setParams],
  );

  const clearFilters = useCallback(
    (extra = {}) =>
      update({ categories: [], minPrice: null, maxPrice: null, minRating: null, inStock: false, onSale: false, ...extra }),
    [update],
  );

  const activeCount =
    filters.categories.length +
    (filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0) +
    (filters.minRating ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.onSale ? 1 : 0);

  /** Stable string for the current query; used to reset pagination when filters change. */
  const key = JSON.stringify(filters);

  return { filters, update, clearFilters, activeCount, key };
}
