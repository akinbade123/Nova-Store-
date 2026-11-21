import { Link } from 'react-router-dom';
import { ArrowRight, Heart, MapPin, Package } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { OrderStatusBadge, itemCount, orderDate } from '../../components/account/orderUtils';
import { AccountSection } from '../../layouts/AccountLayout';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { orderService } from '../../services/orderService';
import { addressService } from '../../services/addressService';
import { productService } from '../../services/productService';
import { countryByCode } from '../../utils/validation';
import { formatPrice } from '../../utils/format';
import { imageUrl } from '../../utils/image';

function Card({ title, action, children, className = '' }) {
  return (
    <div className={`rounded-3xl p-6 ring-1 ring-inset ring-line sm:p-7 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="font-sans text-[15px] font-semibold tracking-normal">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const cardLink = (to, label) => (
  <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
    {label}
    <ArrowRight className="size-3.5" aria-hidden="true" />
  </Link>
);

export default function AccountOverviewPage() {
  useDocumentTitle('My account');
  const { user } = useAuth();
  const { ids: wishlistIds, count: wishlistCount } = useWishlist();
  const orders = useAsync(() => orderService.listOrders(user), [user.id, user.email]);
  const addresses = useAsync(() => addressService.list(user.id), [user.id]);

  const latest = orders.data?.[0];
  const defaultAddress = addresses.data?.find((address) => address.isDefault);
  const saved = [...wishlistIds].reverse().slice(0, 4).map((id) => productService.findById(id)).filter(Boolean);

  const stats = [
    { label: 'Orders', value: orders.data?.length, to: '/account/orders', Icon: Package },
    { label: 'Wishlist', value: wishlistCount, to: '/account/wishlist', Icon: Heart },
    { label: 'Addresses', value: addresses.data?.length, to: '/account/addresses', Icon: MapPin },
  ];

  return (
    <AccountSection title="Overview" description="A quick look at your orders, saved items and details.">
      <ul className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map(({ label, value, to, Icon }) => (
          <li key={label}>
            <Link to={to} className="group flex h-full flex-col justify-between gap-6 rounded-2xl bg-surface p-4 transition-colors hover:bg-line sm:p-5">
              <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
              <div>
                <div className="font-display text-2xl font-bold tabular-nums sm:text-3xl">
                  {value ?? <Skeleton className="h-8 w-8" />}
                </div>
                <p className="mt-0.5 text-[13px] text-muted">{label}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card title="Latest order" action={latest && cardLink('/account/orders', 'All orders')} className="xl:col-span-2">
          {orders.loading ? (
            <Skeleton className="h-24 w-full rounded-2xl" />
          ) : latest ? (
            <Link
              to={`/account/orders/${latest.id}`}
              className="group flex flex-col gap-5 rounded-2xl sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {latest.items.slice(0, 3).map((item) => (
                    <img
                      key={item.productId + (item.size ?? '')}
                      src={imageUrl(item.image, { w: 112, h: 140 })}
                      alt=""
                      className="h-[70px] w-14 rounded-xl bg-surface object-cover ring-2 ring-white"
                    />
                  ))}
                </div>
                <div>
                  <p className="flex flex-wrap items-center gap-2.5 text-sm font-semibold">
                    {latest.id}
                    <OrderStatusBadge status={latest.status} />
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    {orderDate(latest.createdAt)} · {itemCount(latest)} {itemCount(latest) === 1 ? 'item' : 'items'} · {formatPrice(latest.totals.total)}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 group-hover:underline">
                {latest.status === 'Shipped' ? 'Track order' : 'View order'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          ) : (
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">You haven’t placed an order yet.</p>
              <Button to="/shop" size="sm">
                Start shopping
              </Button>
            </div>
          )}
        </Card>

        <Card title="Default address" action={cardLink('/account/addresses', 'Manage')}>
          {addresses.loading ? (
            <Skeleton className="h-20 w-full" />
          ) : defaultAddress ? (
            <address className="text-sm not-italic leading-relaxed text-ink/75">
              <span className="font-medium text-ink">
                {defaultAddress.firstName} {defaultAddress.lastName}
              </span>
              <br />
              {[defaultAddress.address1, defaultAddress.address2].filter(Boolean).join(', ')}
              <br />
              {[defaultAddress.city, defaultAddress.region, defaultAddress.postalCode].filter(Boolean).join(', ')}
              <br />
              {countryByCode(defaultAddress.country).name}
            </address>
          ) : (
            <p className="text-sm text-muted">
              No saved addresses.{' '}
              <Link to="/account/addresses" className="font-medium text-ink underline underline-offset-4">
                Add one
              </Link>{' '}
              for faster checkout.
            </p>
          )}
        </Card>

        <Card title="Account details" action={cardLink('/account/settings', 'Edit')}>
          <dl className="space-y-2.5 text-sm">
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-muted">Name</dt>
              <dd className="font-medium">
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-muted">Email</dt>
              <dd className="min-w-0 truncate font-medium">{user.email}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-muted">Emails</dt>
              <dd>{user.marketing ? 'Subscribed to offers' : 'Order updates only'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Saved for later" action={saved.length > 0 && cardLink('/account/wishlist', 'View all')} className="xl:col-span-2">
          {saved.length > 0 ? (
            <ul className="grid grid-cols-4 gap-3 sm:gap-4">
              {saved.map((product) => (
                <li key={product.id}>
                  <Link to={`/product/${product.slug}`} className="group block">
                    <div className="aspect-[4/5] overflow-hidden rounded-xl bg-surface">
                      <img
                        src={imageUrl(product.images[0].src, { w: 280, h: 350 })}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <p className="mt-2 truncate text-[13px] font-medium">{product.name}</p>
                    <p className="text-[13px] tabular-nums text-muted">{formatPrice(product.price)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Tap the heart on any product to save it here.</p>
          )}
        </Card>
      </div>
    </AccountSection>
  );
}
