import { Minus, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

export function QuantitySelector({ value, onChange, min = 1, max = 10, size = 'md', label = 'Quantity', className }) {
  const dims = size === 'lg' ? 'h-13 [&>button]:size-13' : 'h-10 [&>button]:size-10';
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center rounded-md ring-1 ring-inset ring-line-strong', dims, className)}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="inline-flex items-center justify-center rounded-md transition-colors hover:bg-surface disabled:opacity-30"
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </button>
      <output className="w-8 text-center text-body font-medium tabular-nums" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="inline-flex items-center justify-center rounded-md transition-colors hover:bg-surface disabled:opacity-30"
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
