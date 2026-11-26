import { ChevronDown } from 'lucide-react';
import { SORT_OPTIONS } from '../../hooks/useShopFilters';
import { cn } from '../../utils/cn';

export function SortSelect({ value, onChange, className }) {
  return (
    <label className={cn('relative inline-flex items-center', className)}>
      <span className="sr-only">Sort products</span>
      <span className="pointer-events-none absolute left-4 text-caption text-muted" aria-hidden="true">
        Sort:
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-full bg-white pl-[52px] pr-10 text-caption font-medium ring-1 ring-inset ring-line-strong outline-none transition-shadow hover:ring-ink focus-visible:ring-2 focus-visible:ring-ink"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 size-4 text-muted" aria-hidden="true" />
    </label>
  );
}
