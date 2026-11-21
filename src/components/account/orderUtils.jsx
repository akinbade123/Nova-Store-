import { cn } from '../../utils/cn';
import { BRAND_LABELS } from '../../utils/validation';

const STATUS_STYLES = {
  Processing: 'bg-accent-soft text-accent',
  Shipped: 'bg-sale/10 text-sale',
  Delivered: 'bg-success/10 text-success',
  Cancelled: 'bg-surface text-muted',
};

export function OrderStatusBadge({ status, className }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold', STATUS_STYLES[status], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
}

export const orderDate = (iso) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
export const shortDate = (iso) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));

export const itemCount = (order) => order.items.reduce((sum, item) => sum + item.quantity, 0);

export function paymentLabel(payment) {
  if (payment.method === 'paypal') return 'PayPal';
  if (payment.method === 'applepay') return 'Apple Pay';
  return `${BRAND_LABELS[payment.brand] ?? 'Card'} ending ${payment.last4}`;
}
