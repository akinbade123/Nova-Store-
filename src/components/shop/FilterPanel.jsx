import { useEffect, useId, useState } from 'react';
import { Check, ChevronDown, Star } from 'lucide-react';
import { categories } from '../../data/categories';
import { PRICE_RANGES, RATING_OPTIONS } from '../../hooks/useShopFilters';
import { cn } from '../../utils/cn';

function FilterSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-b border-line py-5 first:pt-0 last:border-0">
      <h3 className="font-sans text-sm font-semibold tracking-normal">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between text-left"
        >
          {title}
          <ChevronDown className={cn('size-4 text-muted transition-transform duration-300', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </h3>
      <div id={id} hidden={!open} className="pt-4">
        {children}
      </div>
    </div>
  );
}

function CheckRow({ checked, onChange, disabled, label, count }) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-lg py-1.5 text-sm',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} disabled={disabled} />
      <span
        className={cn(
          'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] ring-1 ring-inset transition-colors',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          checked ? 'bg-ink ring-ink' : 'bg-white ring-line-strong group-hover:ring-ink',
        )}
        aria-hidden="true"
      >
        {checked && <Check className="size-3 text-white" strokeWidth={3} />}
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs tabular-nums text-muted">{count}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-1.5">
      <span>
        <span className="block text-sm">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        className={cn(
          'relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-200',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          checked ? 'bg-ink' : 'bg-line-strong',
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft',
            checked && 'translate-x-4',
          )}
        />
      </span>
    </label>
  );
}

function PriceFilter({ minPrice, maxPrice, onChange }) {
  const [min, setMin] = useState(minPrice ?? '');
  const [max, setMax] = useState(maxPrice ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setMin(minPrice ?? '');
    setMax(maxPrice ?? '');
    setError('');
  }, [minPrice, maxPrice]);

  const apply = (event) => {
    event.preventDefault();
    const nextMin = min === '' ? null : Number(min);
    const nextMax = max === '' ? null : Number(max);
    if (nextMin !== null && nextMax !== null && nextMin > nextMax) {
      setError('Minimum price must be lower than maximum.');
      return;
    }
    setError('');
    onChange(nextMin, nextMax);
  };

  const inputClass =
    'h-10 w-full rounded-lg bg-white pl-7 pr-2 text-sm tabular-nums ring-1 ring-inset ring-line-strong outline-none transition-shadow focus:ring-2 focus:ring-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none';

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {PRICE_RANGES.map((range) => {
          const active = range.min === minPrice && range.max === maxPrice;
          return (
            <li key={range.label}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => (active ? onChange(null, null) : onChange(range.min, range.max))}
                className={cn(
                  'h-8 rounded-full px-3 text-[13px] font-medium transition-colors',
                  active ? 'bg-ink text-white' : 'ring-1 ring-inset ring-line-strong hover:ring-ink',
                )}
              >
                {range.label}
              </button>
            </li>
          );
        })}
      </ul>
      <form onSubmit={apply} noValidate className="mt-4">
        <div className="flex items-center gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Minimum price</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
            <input type="number" inputMode="numeric" min="0" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} className={inputClass} aria-invalid={Boolean(error)} />
          </label>
          <span className="text-muted" aria-hidden="true">–</span>
          <label className="relative flex-1">
            <span className="sr-only">Maximum price</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
            <input type="number" inputMode="numeric" min="0" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} className={inputClass} aria-invalid={Boolean(error)} />
          </label>
          <button type="submit" className="h-10 shrink-0 rounded-lg bg-ink px-3.5 text-[13px] font-semibold text-white hover:bg-ink-soft">
            Go
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

/** Sidebar / drawer filter controls. Changes apply immediately. */
export function FilterPanel({ filters, update, facets }) {
  const toggleCategory = (slug) => {
    const next = filters.categories.includes(slug)
      ? filters.categories.filter((item) => item !== slug)
      : [...filters.categories, slug];
    update({ categories: next });
  };

  return (
    <div>
      <FilterSection title="Category">
        <div className="space-y-0.5">
          {categories.map((category) => {
            const checked = filters.categories.includes(category.slug);
            const count = facets?.categories?.[category.slug];
            return (
              <CheckRow
                key={category.slug}
                label={category.name}
                count={count}
                checked={checked}
                disabled={!checked && count === 0}
                onChange={() => toggleCategory(category.slug)}
              />
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Price">
        <PriceFilter
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onChange={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
        />
      </FilterSection>

      <FilterSection title="Customer rating">
        <div role="radiogroup" aria-label="Minimum rating" className="space-y-0.5">
          {RATING_OPTIONS.map((value) => {
            const checked = filters.minRating === value;
            return (
              <label key={value} className="group flex cursor-pointer items-center gap-3 py-1.5 text-sm">
                <input
                  type="radio"
                  name="min-rating"
                  className="peer sr-only"
                  checked={checked}
                  onChange={() => update({ minRating: value })}
                  onClick={() => checked && update({ minRating: null })}
                />
                <span
                  className={cn(
                    'flex size-[18px] shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors',
                    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                    checked ? 'ring-[5px] ring-ink' : 'ring-line-strong group-hover:ring-ink',
                  )}
                  aria-hidden="true"
                />
                <span className="flex items-center gap-1.5">
                  <span className="flex" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={cn('size-3.5', i < Math.floor(value) ? 'fill-ink text-ink' : 'fill-line-strong text-line-strong')} strokeWidth={0} />
                    ))}
                  </span>
                  <span>{value} & up</span>
                </span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Availability">
        <div className="space-y-2">
          <Toggle label="In stock only" checked={filters.inStock} onChange={(e) => update({ inStock: e.target.checked })} />
          <Toggle
            label="On sale"
            description="Items with a reduced price"
            checked={filters.onSale}
            onChange={(e) => update({ onSale: e.target.checked })}
          />
        </div>
      </FilterSection>
    </div>
  );
}
