import { formatPrice } from '../../utils/format';
import { cn } from '../../utils/cn';

/**
 * Price breakdown used by the cart page and checkout.
 * `totals` comes from useCart().getTotals(); extra content (promo form, CTAs) goes in children.
 */
export function OrderSummary({ totals, count, savings = 0, promo, shippingNote, title = 'Order summary', className, children }) {
  const rows = [
    { label: `Subtotal (${count} ${count === 1 ? 'item' : 'items'})`, value: formatPrice(totals.subtotal) },
    totals.discount > 0 && { label: `Discount${promo ? ` (${promo.code})` : ''}`, value: `−${formatPrice(totals.discount)}`, tone: 'success' },
    {
      label: shippingNote ?? `Shipping (${totals.method.label})`,
      value: totals.shipping === 0 ? (totals.shippingDiscount > 0 ? 'Free with code' : 'Free') : formatPrice(totals.shipping),
      tone: totals.shipping === 0 ? 'success' : undefined,
    },
  ].filter(Boolean);

  return (
    <section aria-labelledby="summary-heading" className={cn('rounded-3xl bg-surface p-6 sm:p-8', className)}>
      <h2 id="summary-heading" className="text-xl font-semibold">
        {title}
      </h2>
      <dl className="mt-6 space-y-3.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className="text-ink/70">{row.label}</dt>
            <dd className={cn('font-medium tabular-nums', row.tone === 'success' && 'text-success')}>{row.value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-line-strong pt-4">
          <dt className="text-base font-semibold">Total</dt>
          <dd className="text-xl font-semibold tabular-nums">{formatPrice(totals.total)}</dd>
        </div>
      </dl>
      <p className="mt-1.5 text-xs text-muted">Including taxes. Duties calculated at checkout where applicable.</p>
      {savings + totals.discount > 0 && (
        <p className="mt-4 rounded-xl bg-success/[0.07] px-3.5 py-2.5 text-[13px] font-medium text-success">
          You’re saving {formatPrice(savings + totals.discount)} on this order
        </p>
      )}
      {children}
    </section>
  );
}
