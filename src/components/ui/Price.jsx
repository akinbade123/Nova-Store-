import { cn } from '../../utils/cn';
import { formatPrice } from '../../utils/format';

export function Price({ price, compareAtPrice, className }) {
  const onSale = compareAtPrice && compareAtPrice > price;
  return (
    <p className={cn('flex items-baseline gap-2 text-[15px] font-semibold tabular-nums', className)}>
      <span className={onSale ? 'text-sale' : 'text-ink'}>
        {onSale && <span className="sr-only">Sale price </span>}
        {formatPrice(price)}
      </span>
      {onSale && (
        <s className="text-[13px] font-normal text-muted">
          <span className="sr-only">Original price </span>
          {formatPrice(compareAtPrice)}
        </s>
      )}
    </p>
  );
}
