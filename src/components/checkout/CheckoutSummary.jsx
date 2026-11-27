import { useId, useState } from 'react';
import { ChevronDown, ShoppingBag } from 'lucide-react';
import { PromoCodeForm } from '../cart/PromoCodeForm';
import { formatPrice } from '../../utils/format';
import { imageUrl } from '../../utils/image';
import { cn } from '../../utils/cn';

function SummaryItems({ items }) {
  return (
    <ul className="space-y-4">
      {items.map(({ key, product, quantity, color, size }) => (
        <li key={key} className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={imageUrl(product.images[0].src, { w: 128, h: 160 })}
              alt=""
              className="h-20 w-16 rounded-xl bg-white object-cover ring-1 ring-line"
            />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-2xs font-semibold text-white ring-2 ring-surface">
              {quantity}
              <span className="sr-only"> × </span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="mt-0.5 text-caption text-muted">{[color, size && `Size ${size}`].filter(Boolean).join(' · ')}</p>
          </div>
          <p className="shrink-0 text-sm font-medium tabular-nums">{formatPrice(product.price * quantity)}</p>
        </li>
      ))}
    </ul>
  );
}

function SummaryTotals({ totals, count, promo }) {
  const rows = [
    { label: `Subtotal · ${count} ${count === 1 ? 'item' : 'items'}`, value: formatPrice(totals.subtotal) },
    totals.discount > 0 && { label: `Discount (${promo.code})`, value: `−${formatPrice(totals.discount)}`, success: true },
    {
      label: `Shipping · ${totals.method.label}`,
      value: totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping),
      success: totals.shipping === 0,
    },
  ].filter(Boolean);

  return (
    <dl className="space-y-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <dt className="text-ink/70">{row.label}</dt>
          <dd className={cn('font-medium tabular-nums', row.success && 'text-success')}>{row.value}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 border-t border-line-strong pt-4">
        <dt className="text-base font-semibold">Total</dt>
        <dd className="text-right">
          <span className="mr-1.5 text-xs text-muted">USD</span>
          <span className="text-2xl font-semibold tabular-nums">{formatPrice(totals.total)}</span>
        </dd>
      </div>
      <p className="text-xs text-muted">Including taxes.</p>
    </dl>
  );
}

/** Desktop: full sidebar. Mobile: collapsible bar at the top of the form. */
export function CheckoutSummary({ items, totals, count, promo, variant = 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  if (variant === 'collapsible') {
    return (
      <div className="border-b border-line bg-surface lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
          className="mx-auto flex h-16 w-full max-w-xl items-center justify-between gap-4 px-4 sm:px-6"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ShoppingBag className="size-5" strokeWidth={1.75} aria-hidden="true" />
            {open ? 'Hide' : 'Show'} order summary
            <ChevronDown className={cn('size-4 transition-transform duration-300', open && 'rotate-180')} aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tabular-nums">{formatPrice(totals.total)}</span>
        </button>
        {open && (
          <div id={id} className="mx-auto max-w-xl animate-fade-in space-y-6 px-4 pb-6 pt-2 sm:px-6">
            <SummaryItems items={items} />
            <div className="border-t border-line-strong pt-5">
              <PromoCodeForm />
            </div>
            <SummaryTotals totals={totals} count={count} promo={promo} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="checkout-summary-heading" className="space-y-7">
      <h2 id="checkout-summary-heading" className="text-lg font-semibold">
        Order summary
      </h2>
      <SummaryItems items={items} />
      <div className="border-t border-line-strong pt-5">
        <PromoCodeForm />
      </div>
      <SummaryTotals totals={totals} count={count} promo={promo} />
    </section>
  );
}
