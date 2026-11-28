import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, Copy, CreditCard, Mail, MapPin, PackageSearch, Truck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../context/ToastContext';
import { orderService } from '../services/orderService';
import { BRAND_LABELS, countryByCode } from '../utils/validation';
import { formatPrice } from '../utils/format';
import { imageUrl } from '../utils/image';
import { cn } from '../utils/cn';
import { contactEmail } from '../data/site';

const paymentLabel = (payment) => {
  if (payment.method === 'paypal') return 'PayPal';
  if (payment.method === 'applepay') return 'Apple Pay';
  return `${BRAND_LABELS[payment.brand] ?? 'Card'} ending ${payment.last4}`;
};

function InfoCard({ Icon, title, children }) {
  return (
    <div className="rounded-2xl p-5 ring-1 ring-inset ring-line">
      <p className="flex items-center gap-2 text-caption font-semibold">
        <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        {title}
      </p>
      <div className="mt-2.5 text-sm leading-relaxed text-ink/75">{children}</div>
    </div>
  );
}

const steps = ['Order placed', 'Processing', 'Shipped', 'Delivered'];

export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const { state } = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const passed = state?.order?.id === orderId ? state.order : null;
  const { data, loading, error, retry } = useAsync(() => (passed ? Promise.resolve(passed) : orderService.getOrder(orderId)), [orderId]);
  const order = passed ?? data;
  useDocumentTitle(order ? `Order ${order.id} confirmed` : 'Order confirmation');

  if (!order && loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-16" aria-busy="true">
        <Skeleton className="mx-auto size-16 rounded-full" />
        <Skeleton className="mx-auto h-9 w-2/3" />
        <Skeleton className="mx-auto h-4 w-1/2" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  // A failed request isn't a missing order: offer a retry instead of "couldn't find".
  if (!order && error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState message={error.userMessage ?? 'We couldn’t load your order.'} onRetry={retry} />
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="We couldn’t find that order"
        message="Check the link in your confirmation email, or contact support with your order number."
        action={{ label: 'Continue shopping', to: '/shop' }}
      />
    );
  }

  const address = order.shippingAddress;
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'error', title: 'Couldn’t copy', description: 'Select the order number to copy it manually.' });
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 lg:pt-16">
      {/* Hero */}
      <div className="text-center">
        <span className="mx-auto flex size-16 animate-fade-in items-center justify-center rounded-full bg-success text-white">
          <Check className="size-8" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <p className="mt-6 eyebrow text-muted">Order confirmed</p>
        <h1 className="mt-3 text-title font-bold leading-tight tracking-tight sm:text-5xl">
          Thank you, {address.firstName}!
        </h1>
        <p className="mx-auto mt-4 max-w-md text-body leading-relaxed text-muted">
          We’ve received your order and sent a confirmation to <span className="font-medium text-ink">{order.contact.email}</span>.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface py-1.5 pl-4 pr-1.5 text-sm">
          <span className="text-muted">Order number</span>
          <span className="font-semibold tracking-wide">{order.id}</span>
          <button
            type="button"
            onClick={copyId}
            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-white"
            aria-label={copied ? 'Order number copied' : 'Copy order number'}
          >
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {/* Progress */}
      <ol className="mt-12 grid grid-cols-4 gap-2" aria-label="Order status">
        {steps.map((step, index) => (
          <li key={step} className="text-center">
            <div className={cn('h-1 rounded-full', index === 0 ? 'bg-ink' : 'bg-line')} />
            <p className={cn('mt-2.5 text-xs', index === 0 ? 'font-semibold text-ink' : 'text-muted')}>
              {step}
              {index === 0 && <span className="sr-only"> (current)</span>}
            </p>
          </li>
        ))}
      </ol>

      {/* Details */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <InfoCard Icon={Truck} title="Estimated delivery">
          <p className="font-medium text-ink">{order.estimatedDelivery}</p>
          <p>
            {order.shippingMethod.label} · {order.shippingMethod.eta}
          </p>
        </InfoCard>
        <InfoCard Icon={MapPin} title="Delivering to">
          <p className="font-medium text-ink">
            {address.firstName} {address.lastName}
          </p>
          <p>
            {[address.address1, address.address2].filter(Boolean).join(', ')}
            <br />
            {[address.city, address.region, address.postalCode].filter(Boolean).join(', ')}
            <br />
            {countryByCode(address.country).name}
          </p>
        </InfoCard>
        <InfoCard Icon={CreditCard} title="Payment">
          <p className="font-medium text-ink">{paymentLabel(order.payment)}</p>
          <p>Charged {formatPrice(order.totals.total)}</p>
        </InfoCard>
        <InfoCard Icon={Mail} title="Updates">
          <p>
            We’ll email <span className="font-medium text-ink">{order.contact.email}</span> and text{' '}
            <span className="font-medium text-ink">{order.contact.phone}</span> when your order ships.
          </p>
        </InfoCard>
      </div>

      {/* Items */}
      <section aria-labelledby="order-items" className="mt-10 rounded-3xl bg-surface p-6 sm:p-8">
        <h2 id="order-items" className="text-lg font-semibold">
          Order summary
        </h2>
        <ul className="mt-6 space-y-4">
          {order.items.map((item) => (
            <li key={`${item.productId}-${item.color}-${item.size}`} className="flex items-center gap-4">
              <Link to={`/product/${item.slug}`} className="shrink-0">
                <img
                  src={imageUrl(item.image, { w: 128, h: 160 })}
                  alt={item.name}
                  className="h-20 w-16 rounded-xl bg-white object-cover ring-1 ring-line"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="mt-0.5 text-caption text-muted">
                  {[item.color, item.size && `Size ${item.size}`, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums">{formatPrice(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-3 border-t border-line-strong pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink/70">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.totals.subtotal)}</dd>
          </div>
          {order.totals.discount > 0 && (
            <div className="flex justify-between text-success">
              <dt>Discount{order.promo ? ` (${order.promo.code})` : ''}</dt>
              <dd className="tabular-nums">−{formatPrice(order.totals.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink/70">Shipping</dt>
            <dd className="tabular-nums">{order.totals.shipping === 0 ? 'Free' : formatPrice(order.totals.shipping)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line-strong pt-4">
            <dt className="text-base font-semibold">Total paid</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatPrice(order.totals.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Button to="/shop" size="lg">
          Continue shopping
        </Button>
        <Button to="/account/orders" size="lg" variant="secondary">
          View my orders
        </Button>
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        Questions about your order?{' '}
        <a href={`mailto:${contactEmail.support}`} className="font-medium text-ink underline underline-offset-4">
          Contact support
        </a>
      </p>
    </div>
  );
}
