import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, CreditCard, MapPin, PackageSearch, RotateCcw, Truck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { OrderStatusBadge, orderDate, paymentLabel, shortDate } from '../../components/account/orderUtils';
import { useBuyAgain } from '../../components/account/useBuyAgain';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { orderService } from '../../services/orderService';
import { countryByCode } from '../../utils/validation';
import { formatPrice } from '../../utils/format';
import { imageUrl } from '../../utils/image';
import { cn } from '../../utils/cn';

function timeline(order) {
  if (order.status === 'Cancelled') {
    return [
      { label: 'Order placed', date: shortDate(order.createdAt), done: true },
      { label: 'Cancelled', date: order.cancelledAt ? shortDate(order.cancelledAt) : '', done: true },
    ];
  }
  const reached = { Processing: 1, Shipped: 2, Delivered: 3 }[order.status] ?? 0;
  return [
    { label: 'Order placed', date: shortDate(order.createdAt), done: true },
    { label: 'Processing', date: reached === 1 ? 'Being packed' : shortDate(order.createdAt), done: reached >= 1 },
    { label: 'Shipped', date: order.shippedAt ? shortDate(order.shippedAt) : '', done: reached >= 2 },
    {
      label: 'Delivered',
      date: order.deliveredAt ? shortDate(order.deliveredAt) : order.estimatedDelivery ? `Expected ${order.estimatedDelivery}` : '',
      done: reached >= 3,
    },
  ];
}

function Timeline({ order }) {
  const steps = timeline(order);
  const current = steps.filter((step) => step.done).length - 1;
  return (
    <ol className="grid gap-4 sm:grid-cols-[repeat(var(--steps),minmax(0,1fr))] sm:gap-3" style={{ '--steps': steps.length }}>
      {steps.map((step, index) => (
        <li key={step.label} className="flex gap-3 sm:block">
          <div className="flex flex-col items-center sm:flex-row">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-white',
                step.done ? (order.status === 'Cancelled' && index > 0 ? 'bg-muted' : 'bg-ink') : 'bg-white ring-2 ring-inset ring-line-strong',
              )}
            >
              {step.done && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
            </span>
            {index < steps.length - 1 && (
              <span className={cn('w-0.5 flex-1 sm:h-0.5 sm:w-auto', index < current ? 'bg-ink' : 'bg-line')} aria-hidden="true" />
            )}
          </div>
          <div className="pb-2 sm:mt-3 sm:pb-0">
            <p className={cn('text-sm font-semibold', !step.done && 'text-muted')}>
              {step.label}
              {index === current && <span className="sr-only"> (current status)</span>}
            </p>
            <p className="mt-0.5 text-[13px] text-muted">{step.date || ' '}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function AddressBlock({ address }) {
  return (
    <address className="not-italic">
      <span className="font-medium text-ink">
        {address.firstName} {address.lastName}
      </span>
      <br />
      {[address.address1, address.address2].filter(Boolean).join(', ')}
      <br />
      {[address.city, address.region, address.postalCode].filter(Boolean).join(', ')}
      <br />
      {countryByCode(address.country).name}
    </address>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const buyAgain = useBuyAgain();
  const { data: loaded, loading } = useAsync(() => orderService.getUserOrder(user, orderId), [orderId, user.id]);
  const [override, setOverride] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const order = override?.id === orderId ? override : loaded;
  useDocumentTitle(order ? `Order ${order.id}` : 'Order');

  const back = (
    <Link to="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" />
      All orders
    </Link>
  );

  if (loading && !order) {
    return (
      <div className="space-y-6" aria-busy="true">
        {back}
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        {back}
        <div className="mt-6 flex flex-col items-center rounded-3xl bg-surface px-6 py-16 text-center">
          <PackageSearch className="size-8" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-5 font-display text-xl font-semibold">We couldn’t find that order</p>
          <p className="mt-2 max-w-sm text-sm text-muted">It may belong to a different account. Check the order number in your confirmation email.</p>
        </div>
      </div>
    );
  }

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(order.tracking.number);
      toast({ title: 'Tracking number copied' });
    } catch {
      toast({ variant: 'error', title: 'Couldn’t copy', description: 'Select the number to copy it manually.' });
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      const updated = await orderService.cancelOrder(order.id);
      setOverride(updated);
      toast({ title: 'Order cancelled', description: `You’ll be refunded ${formatPrice(order.totals.total)} within 5 business days.` });
    } catch (err) {
      toast({ variant: 'error', title: 'Couldn’t cancel order', description: err.userMessage });
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  return (
    <div>
      {back}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight sm:text-[28px]">
            Order {order.id}
            <OrderStatusBadge status={order.status} />
          </h2>
          <p className="mt-1.5 text-sm text-muted">Placed on {orderDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => buyAgain(order.items)}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Buy again
          </Button>
          {order.status === 'Processing' && (
            <Button variant="danger-outline" size="sm" onClick={() => setConfirmCancel(true)}>
              Cancel order
            </Button>
          )}
          {order.status === 'Delivered' && (
            <Button variant="secondary" size="sm" to="/help#returns">
              Return items
            </Button>
          )}
        </div>
      </div>

      <section aria-label="Order progress" className="mt-8 rounded-3xl p-6 ring-1 ring-inset ring-line sm:p-7">
        <Timeline order={order} />
        {order.tracking && order.status !== 'Cancelled' && (
          <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3 text-sm">
              <Truck className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>
                <span className="font-medium">{order.tracking.carrier}</span>
                <span className="text-muted"> · Tracking </span>
                <span className="font-mono text-[13px] font-medium">{order.tracking.number}</span>
              </span>
            </p>
            <Button size="sm" variant="secondary" onClick={copyTracking} className="bg-white">
              <Copy className="size-3.5" aria-hidden="true" />
              Copy number
            </Button>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <section aria-labelledby="items-heading" className="rounded-3xl p-6 ring-1 ring-inset ring-line sm:p-7">
          <h3 id="items-heading" className="font-sans text-[15px] font-semibold tracking-normal">
            Items
          </h3>
          <ul className="mt-5 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.productId + (item.size ?? '') + (item.color ?? '')} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <Link to={`/product/${item.slug}`} className="shrink-0">
                  <img src={imageUrl(item.image, { w: 144, h: 180 })} alt={item.name} className="h-[90px] w-[72px] rounded-xl bg-surface object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${item.slug}`} className="text-sm font-medium underline-offset-4 hover:underline">
                    {item.name}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {[item.color, item.size && `Size ${item.size}`, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}
                  </p>
                  <button
                    type="button"
                    onClick={() => buyAgain([item])}
                    className="mt-2 text-[13px] font-medium underline underline-offset-4 hover:text-muted"
                  >
                    Buy again
                  </button>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">{formatPrice(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
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
              <dt className="text-ink/70">Shipping · {order.shippingMethod.label}</dt>
              <dd className="tabular-nums">{order.totals.shipping === 0 ? 'Free' : formatPrice(order.totals.shipping)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatPrice(order.totals.total)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-4 text-sm leading-relaxed text-ink/75">
          <div className="rounded-3xl p-6 ring-1 ring-inset ring-line">
            <p className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <MapPin className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Delivery address
            </p>
            <AddressBlock address={order.shippingAddress} />
          </div>
          <div className="rounded-3xl p-6 ring-1 ring-inset ring-line">
            <p className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <CreditCard className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Payment
            </p>
            <p className="font-medium text-ink">{paymentLabel(order.payment)}</p>
            <p>{order.status === 'Cancelled' ? 'Refund in progress' : `Charged ${formatPrice(order.totals.total)}`}</p>
          </div>
          <div className="rounded-3xl bg-surface p-6">
            <p className="font-semibold text-ink">Need help with this order?</p>
            <p className="mt-1">Our team replies within a few hours, Monday to Saturday.</p>
            <a href={`mailto:support@nova.store?subject=Order%20${order.id}`} className="mt-3 inline-block font-medium text-ink underline underline-offset-4">
              Contact support
            </a>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancel}
        loading={cancelling}
        title="Cancel this order?"
        confirmLabel="Cancel order"
      >
        Order <span className="font-semibold text-ink">{order.id}</span> hasn’t shipped yet, so we can cancel it now. You’ll
        receive a full refund of <span className="font-semibold text-ink">{formatPrice(order.totals.total)}</span> to your
        original payment method within 5 business days.
      </ConfirmDialog>
    </div>
  );
}
