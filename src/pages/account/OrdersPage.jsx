import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { OrderStatusBadge } from '../../components/account/OrderStatusBadge';
import { itemCount } from '../../utils/orders';
import { useBuyAgain } from '../../components/account/useBuyAgain';
import { AccountSection } from '../../layouts/AccountLayout';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { orderService } from '../../services/orderService';
import { formatDate, formatPrice } from '../../utils/format';
import { imageUrl } from '../../utils/image';
import { cn } from '../../utils/cn';

const FILTERS = ['All', 'Processing', 'Shipped', 'Delivered'];

function OrderCard({ order }) {
  const buyAgain = useBuyAgain();
  const count = itemCount(order);
  const extra = order.items.length - 4;

  return (
    <li className="rounded-3xl ring-1 ring-inset ring-line">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line px-5 py-4 sm:px-6">
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted">Order</dt>
            <dd className="mt-0.5 font-semibold">{order.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Placed</dt>
            <dd className="mt-0.5 font-medium">{formatDate(order.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Total</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{formatPrice(order.totals.total)}</dd>
          </div>
        </dl>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <ul className="flex shrink-0 gap-2" aria-label={`${count} ${count === 1 ? 'item' : 'items'}`}>
            {order.items.slice(0, 4).map((item) => (
              <li key={item.productId + (item.size ?? '') + (item.color ?? '')}>
                <img
                  src={imageUrl(item.image, { w: 112, h: 140 })}
                  alt={item.name}
                  className="h-[70px] w-14 rounded-xl bg-surface object-cover"
                />
              </li>
            ))}
            {extra > 0 && (
              <li className="flex h-[70px] w-14 items-center justify-center rounded-xl bg-surface text-sm font-medium text-muted">+{extra}</li>
            )}
          </ul>
          <p className="hidden min-w-0 text-sm text-muted md:block">
            <span className="line-clamp-2">{order.items.map((item) => item.name).join(', ')}</span>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" onClick={() => buyAgain(order.items)}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Buy again
          </Button>
          <Button size="sm" to={`/account/orders/${order.id}`}>
            {order.status === 'Shipped' ? 'Track' : 'Details'}
            <ArrowRight className="size-3.5" aria-hidden="true" />
            <span className="sr-only"> for order {order.id}</span>
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function OrdersPage() {
  useDocumentTitle('Orders');
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  // The cursor belongs to a filter: switching tabs starts again at the first page.
  const [page, setPage] = useState({ filter, cursor: null });
  const cursor = page.filter === filter ? page.cursor : null;
  const { data, loading, error, retry } = useAsync(
    () =>
      orderService.listOrders(user, { status: filter === 'All' ? undefined : filter, cursor }).then((result) => ({
        ...result,
        filter,
        // "Show more" adds the next page to the orders already on screen.
        items: cursor && data?.filter === filter ? [...data.items, ...result.items] : result.items,
      })),
    [user.id, user.email, filter, cursor],
  );
  const current = data?.filter === filter ? data : null;
  const orders = current?.items ?? [];
  const loadingMore = loading && Boolean(cursor) && Boolean(current);
  const countFor = (status) => data?.counts[status] ?? 0;

  return (
    <AccountSection title="Orders" description="Track deliveries, view receipts and reorder favourites.">
      {countFor('All') > 0 && (
        <div role="tablist" aria-label="Filter orders by status" className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={filter === status}
              onClick={() => setFilter(status)}
              className={cn(
                'h-9 shrink-0 rounded-md px-4 text-caption font-medium transition-colors',
                filter === status ? 'bg-ink text-white' : 'ring-1 ring-inset ring-line-strong hover:ring-ink',
              )}
            >
              {status} <span className={cn('ml-0.5 tabular-nums', filter === status ? 'text-white/70' : 'text-muted')}>{countFor(status)}</span>
            </button>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState message="We couldn’t load your orders." onRetry={retry} />
      ) : loading && !loadingMore ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-3xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-surface px-6 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white">
            <Package className="size-7" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="mt-5 font-display text-xl font-semibold">
            {filter === 'All' ? 'No orders yet' : `No ${filter.toLowerCase()} orders`}
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            {filter === 'All' ? 'When you place an order, it will appear here with live tracking.' : 'Try another filter to see your other orders.'}
          </p>
          {filter === 'All' ? (
            <Button to="/shop" className="mt-7">
              Start shopping
            </Button>
          ) : (
            <Button variant="secondary" className="mt-7" onClick={() => setFilter('All')}>
              Show all orders
            </Button>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
          {current?.nextCursor && (
            <div className="mt-8 flex justify-center">
              <Button variant="secondary" loading={loadingMore} onClick={() => setPage({ filter, cursor: current.nextCursor })}>
                Show more orders
              </Button>
            </div>
          )}
        </>
      )}
      <p className="mt-8 text-sm text-muted">
        Can’t find an order placed as a guest? Make sure you’re signed in with the email you used at checkout, or{' '}
        <Link to="/help#contact" className="font-medium text-ink underline underline-offset-4">
          contact support
        </Link>
        .
      </p>
    </AccountSection>
  );
}
