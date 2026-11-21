import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, RotateCcw, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { PaymentIcons } from '../components/ui/BrandIcons';
import { ProductCarousel } from '../components/product/ProductCarousel';
import { CartLineItem } from '../components/cart/CartLineItem';
import { OrderSummary } from '../components/cart/OrderSummary';
import { PromoCodeForm } from '../components/cart/PromoCodeForm';
import { useCart } from '../context/CartContext';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { productService } from '../services/productService';
import { FREE_SHIPPING_THRESHOLD } from '../data/site';
import { formatPrice } from '../utils/format';

function FreeShippingProgress({ subtotal, remaining }) {
  const progress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  return (
    <div className="rounded-2xl bg-surface px-5 py-4">
      <p className="flex items-center gap-2.5 text-sm">
        <Truck className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
        {remaining > 0 ? (
          <span>
            Add <strong className="font-semibold">{formatPrice(remaining)}</strong> more for free express shipping
          </span>
        ) : (
          <span className="font-medium">Your order ships free with express delivery</span>
        )}
      </p>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-strong"
        role="progressbar"
        aria-label="Progress towards free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out-soft" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Recommendations({ excludeIds, title, eyebrow }) {
  const { data, loading } = useAsync(() => productService.list({ sort: 'popular', limit: 14 }), []);
  const products = (data ?? []).filter((product) => !excludeIds.includes(product.id)).slice(0, 8);
  if (!loading && products.length === 0) return null;

  return (
    <section aria-labelledby="recs-heading" className="overflow-hidden border-t border-line py-16 lg:py-24">
      <Container>
        <ProductCarousel
          products={products}
          loading={loading}
          label={title}
          renderHeader={(controls) => (
            <SectionHeader id="recs-heading" eyebrow={eyebrow} title={title} actions={<div className="hidden sm:block">{controls}</div>} />
          )}
        />
      </Container>
    </section>
  );
}

const trust = [
  { Icon: Lock, text: 'Secure, encrypted checkout' },
  { Icon: RotateCcw, text: 'Free returns within 30 days' },
  { Icon: ShieldCheck, text: 'Warranty on every product' },
];

export default function CartPage() {
  const { items, count, subtotal, savings, amountToFreeShipping, promo, getTotals } = useCart();
  const totals = getTotals();
  const isEmpty = items.length === 0;
  useDocumentTitle('Your bag');

  // Room for the mobile checkout bar.
  useEffect(() => {
    if (isEmpty) return undefined;
    document.body.classList.add('has-bottom-bar');
    return () => document.body.classList.remove('has-bottom-bar');
  }, [isEmpty]);

  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Bag' }];

  if (isEmpty) {
    return (
      <>
        <Container className="pb-16 pt-6 lg:pt-10">
          <Breadcrumbs items={crumbs} />
          <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center lg:py-24">
            <span className="flex size-20 items-center justify-center rounded-full bg-surface">
              <ShoppingBag className="size-8" strokeWidth={1.4} aria-hidden="true" />
            </span>
            <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Your bag is empty</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Nothing here yet. Explore new arrivals and best sellers — or pick up where you left off in your wishlist.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button to="/shop" size="lg">
                Start shopping
              </Button>
              <Button to="/wishlist" size="lg" variant="secondary">
                View wishlist
              </Button>
            </div>
          </div>
        </Container>
        <Recommendations excludeIds={[]} eyebrow="Popular right now" title="Customers are loving" />
      </>
    );
  }

  return (
    <>
      <Container className="pb-16 pt-6 lg:pb-24 lg:pt-10">
        <Breadcrumbs items={crumbs} />
        <div className="mt-6 flex items-end justify-between gap-4 lg:mt-8">
          <h1 className="text-[34px] font-bold leading-none tracking-[-0.03em] sm:text-5xl">
            Your bag <span className="text-2xl font-semibold text-muted sm:text-3xl">({count})</span>
          </h1>
          <Link
            to="/shop"
            className="hidden items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline sm:inline-flex"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Continue shopping
          </Link>
        </div>

        <div className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_440px] xl:gap-16">
          {/* Items */}
          <section aria-labelledby="items-heading">
            <h2 id="items-heading" className="sr-only">
              Items in your bag
            </h2>
            <FreeShippingProgress subtotal={subtotal} remaining={amountToFreeShipping} />
            <ul className="mt-2 divide-y divide-line border-b border-line">
              {items.map((item) => (
                <CartLineItem key={item.key} item={item} />
              ))}
            </ul>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {trust.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-[13px] text-muted">
                  <Icon className="size-[18px] shrink-0 text-ink" strokeWidth={1.5} aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </section>

          {/* Summary */}
          <div>
            <div className="lg:sticky lg:top-24">
              <OrderSummary totals={totals} count={count} savings={savings} promo={promo} shippingNote={`Shipping (${totals.method.label})`}>
                <div className="mt-6 border-t border-line-strong pt-5">
                  <PromoCodeForm />
                </div>
                <div className="mt-6 grid gap-3">
                  <Button to="/checkout" size="lg" fullWidth className="group">
                    Proceed to checkout
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Button>
                  <Button to="/shop" size="lg" variant="secondary" fullWidth className="bg-transparent">
                    Continue shopping
                  </Button>
                </div>
                <p className="mt-5 text-center text-xs text-muted">Faster options like Express and Next day are available at checkout.</p>
                <PaymentIcons className="mt-5 flex flex-wrap justify-center gap-1.5" />
              </OrderSummary>
            </div>
          </div>
        </div>
      </Container>

      <Recommendations excludeIds={items.map((item) => item.productId)} eyebrow="Before you go" title="You might also like" />

      {/* Mobile checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">Total ({count} {count === 1 ? 'item' : 'items'})</p>
            <p className="text-lg font-semibold tabular-nums">{formatPrice(totals.total)}</p>
          </div>
          <Button to="/checkout" size="lg" className="px-7">
            Checkout
          </Button>
        </div>
      </div>
    </>
  );
}
