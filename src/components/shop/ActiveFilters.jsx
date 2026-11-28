import { X } from 'lucide-react';
import { categoryName } from '../../data/categories';
import { formatPrice } from '../../utils/format';

function priceLabel(min, max) {
  if (min !== null && max !== null) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min !== null) return `${formatPrice(min)} & above`;
  return `Under ${formatPrice(max)}`;
}

export function ActiveFilters({ filters, update, clearFilters }) {
  const chips = [
    ...(filters.q ? [{ key: 'q', label: `“${filters.q}”`, remove: () => update({ q: '' }) }] : []),
    ...filters.categories.map((slug) => ({
      key: `cat-${slug}`,
      label: categoryName(slug),
      remove: () => update({ categories: filters.categories.filter((item) => item !== slug) }),
    })),
    ...(filters.minPrice !== null || filters.maxPrice !== null
      ? [{ key: 'price', label: priceLabel(filters.minPrice, filters.maxPrice), remove: () => update({ minPrice: null, maxPrice: null }) }]
      : []),
    ...(filters.minRating ? [{ key: 'rating', label: `${filters.minRating}★ & up`, remove: () => update({ minRating: null }) }] : []),
    ...(filters.inStock ? [{ key: 'stock', label: 'In stock', remove: () => update({ inStock: false }) }] : []),
    ...(filters.onSale ? [{ key: 'sale', label: 'On sale', remove: () => update({ onSale: false }) }] : []),
  ];

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          className="group inline-flex h-8 animate-fade-in items-center gap-1.5 rounded-md bg-surface pl-3.5 pr-2.5 text-caption font-medium transition-colors hover:bg-line-strong"
          aria-label={`Remove filter: ${chip.label}`}
        >
          {chip.label}
          <X className="size-3.5 text-muted group-hover:text-ink" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => clearFilters({ q: '' })}
        className="ml-1 text-caption font-medium text-muted underline underline-offset-4 hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}
