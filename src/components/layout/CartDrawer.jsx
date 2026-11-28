import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Truck } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { useCart, maxQuantityFor } from '../../context/CartContext';
import { useUI } from '../../context/UIContext';
import { imageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/format';
import { FREE_SHIPPING_THRESHOLD } from '../../data/site';

export function CartDrawer() {
  const { isCartOpen, close } = useUI();
  const { items, count, subtotal, amountToFreeShipping, updateQuantity, removeItem } = useCart();
  const progress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  return (
    <Sheet
      open={isCartOpen}
      onClose={close}
      label="Shopping bag"
      title={<h2 className="text-lg font-semibold">Your bag</h2>}
      headerExtra={count > 0 && <span className="text-sm text-muted">({count})</span>}
      footer={
        items.length > 0 && (
          <div>
            <dl className="flex items-center justify-between text-[15px] font-semibold">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </dl>
            <p className="mt-1 text-[13px] text-muted">Shipping and taxes calculated at checkout.</p>
            <div className="mt-5 grid gap-2.5">
              <Button to="/checkout" onClick={close} size="lg" fullWidth>
                Checkout
              </Button>
              <Button to="/cart" onClick={close} variant="secondary" size="lg" fullWidth>
                View bag
              </Button>
            </div>
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-surface">
            <ShoppingBag className="size-7 text-ink" strokeWidth={1.5} />
          </span>
          <p className="mt-5 font-display text-xl font-semibold">Your bag is empty</p>
          <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted">
            Looks like you haven’t added anything yet. Let’s find your next favourite.
          </p>
          <Button to="/shop" onClick={close} className="mt-7">
            Start shopping
          </Button>
        </div>
      ) : (
        <>
          <div className="border-b border-line bg-surface/60 px-5 py-4 sm:px-6">
            <p className="flex items-center gap-2 text-[13px]">
              <Truck className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {amountToFreeShipping > 0 ? (
                <span>
                  You’re <strong className="font-semibold">{formatPrice(amountToFreeShipping)}</strong> away from free shipping
                </span>
              ) : (
                <span className="font-medium">You’ve unlocked free express shipping</span>
              )}
            </p>
            <div
              className="mt-2.5 h-1 overflow-hidden rounded-full bg-line-strong"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-label="Progress towards free shipping"
            >
              <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out-soft" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <ul className="divide-y divide-line px-5 sm:px-6">
            {items.map(({ key, product, quantity, color, size }) => (
              <li key={key} className="flex gap-4 py-5">
                <Link
                  to={`/product/${product.slug}`}
                  onClick={close}
                  className="block h-[104px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-surface"
                >
                  <img
                    src={imageUrl(product.images[0].src, { w: 168, h: 208 })}
                    alt={product.name}
                    className="size-full object-cover"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/product/${product.slug}`}
                      onClick={close}
                      className="text-sm font-medium leading-snug underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(product.price * quantity)}</p>
                  </div>
                  <p className="mt-1 text-[13px] text-muted">{[color, size && `Size ${size}`].filter(Boolean).join(' · ') || '\u00a0'}</p>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex h-9 items-center rounded-md ring-1 ring-inset ring-line-strong">
                      <button
                        type="button"
                        onClick={() => updateQuantity(key, quantity - 1)}
                        className="inline-flex size-9 items-center justify-center rounded-md hover:bg-surface"
                        aria-label={`Decrease quantity of ${product.name}`}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium tabular-nums" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(key, quantity + 1)}
                        disabled={quantity >= maxQuantityFor(product)}
                        className="inline-flex size-9 items-center justify-center rounded-md hover:bg-surface disabled:opacity-30"
                        aria-label={`Increase quantity of ${product.name}`}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(key)}
                      className="text-[13px] text-muted underline underline-offset-4 hover:text-ink"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
