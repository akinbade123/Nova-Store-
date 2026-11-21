import { Star } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCount } from '../../utils/format';

/** Five-star display with fractional fill. */
export function Rating({ value, count, size = 'sm', className }) {
  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4';
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="relative flex" role="img" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
        <div className="flex gap-px text-line-strong">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn(iconSize, 'fill-current')} strokeWidth={0} />
          ))}
        </div>
        <div className="absolute inset-0 flex gap-px overflow-hidden text-star" style={{ width: `${(value / 5) * 100}%` }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn(iconSize, 'shrink-0 fill-current')} strokeWidth={0} />
          ))}
        </div>
      </div>
      {count !== undefined && (
        <span className="text-xs text-muted">
          {value.toFixed(1)} <span aria-hidden="true">·</span> {formatCount(count)}
          <span className="sr-only"> reviews</span>
        </span>
      )}
    </div>
  );
}
