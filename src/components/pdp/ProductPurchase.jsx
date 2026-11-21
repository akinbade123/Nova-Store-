import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert, Heart, RotateCcw, Ruler, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Rating } from '../ui/Rating';
import { Sheet } from '../ui/Sheet';
import { QuantitySelector } from '../ui/QuantitySelector';
import { PaymentIcons } from '../ui/BrandIcons';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { useUI } from '../../context/UIContext';
import { categoryName } from '../../data/categories';
import { sizeGuides } from '../../data/productDetails';
import { FREE_SHIPPING_THRESHOLD } from '../../data/site';
import { deliveryWindow, discountPercent, formatPrice } from '../../utils/format';
import { imageUrl } from '../../utils/image';
import { cn } from '../../utils/cn';

function SizeGuideSheet({ guide, open, onClose }) {
  if (!guide) return null;
  return (
    <Sheet open={open} onClose={onClose} title={guide.title} className="sm:max-w-[480px]">
      <div className="px-5 py-6 sm:px-6">
        <p className="text-sm leading-relaxed text-muted">{guide.note}</p>
        <div className="mt-6 overflow-hidden rounded-xl ring-1 ring-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface">
              <tr>
                {guide.columns.map((column) => (
                  <th key={column} scope="col" className="px-4 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {guide.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="px-4 py-3 font-medium">
                        {cell}
                      </th>
                    ) : (
                      <td key={i} className="px-4 py-3 tabular-nums text-muted">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Sheet>
  );
}

export function ProductPurchase({ product }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const { toast } = useToast();
  const { openCart } = useUI();

  const [color, setColor] = useState(product.colors[0]?.name ?? null);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [notified, setNotified] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const sizeGroupRef = useRef(null);
  const actionsRef = useRef(null);

  const discount = discountPercent(product.price, product.compareAtPrice);
  const saved = has(product.id);
  const needsSize = product.sizes.length > 0;
  const maxQuantity = Math.max(1, Math.min(10, product.stockCount));
  const lowStock = product.inStock && product.stockCount <= 5;
  const guide = product.sizeGuide ? sizeGuides[product.sizeGuide] : null;

  // Mobile: reveal a sticky purchase bar once the main buttons scroll out of view.
  useEffect(() => {
    const node = actionsRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) =>
      setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Leave room at the bottom of the page so the sticky bar never covers the footer.
  useEffect(() => {
    if (!product.inStock) return undefined;
    document.body.classList.add('has-bottom-bar');
    return () => document.body.classList.remove('has-bottom-bar');
  }, [product.inStock]);

  const requireSize = () => {
    if (needsSize && !size) {
      setSizeError(true);
      sizeGroupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sizeGroupRef.current?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
      return false;
    }
    return true;
  };

  const handleAdd = () => {
    if (!requireSize()) return;
    addItem(product, { quantity, color, size });
    openCart();
  };

  const handleBuyNow = () => {
    if (!requireSize()) return;
    addItem(product, { quantity, color, size });
    navigate('/checkout');
  };

  const handleWishlist = () => {
    const added = toggle(product.id);
    toast({
      title: added ? 'Saved to wishlist' : 'Removed from wishlist',
      description: product.name,
      image: product.images[0].src,
      action: added ? { label: 'View', onClick: () => navigate('/wishlist') } : undefined,
    });
  };

  return (
    <div>
      {/* Title block */}
      <div className="flex items-center gap-2">
        <Link
          to={`/shop?category=${product.category}`}
          className="text-[13px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {categoryName(product.category)}
        </Link>
        {product.badge && <Badge tone="dark">{product.badge}</Badge>}
      </div>
      <h1 className="mt-3 text-[28px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-4xl">{product.name}</h1>
      <a href="#reviews" className="mt-3 inline-flex items-center gap-2 underline-offset-4 hover:underline">
        <Rating value={product.rating} size="md" />
        <span className="text-[13px] text-muted">
          {product.rating.toFixed(1)} · {product.reviewCount.toLocaleString()} reviews
        </span>
      </a>

      {/* Price */}
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[26px] font-semibold tabular-nums tracking-tight">
          {discount > 0 && <span className="sr-only">Sale price </span>}
          <span className={discount > 0 ? 'text-sale' : ''}>{formatPrice(product.price)}</span>
        </p>
        {discount > 0 && (
          <>
            <s className="text-lg text-muted tabular-nums">
              <span className="sr-only">Original price </span>
              {formatPrice(product.compareAtPrice)}
            </s>
            <Badge tone="sale">Save {discount}%</Badge>
          </>
        )}
      </div>
      <p className="mt-1 text-[13px] text-muted">Tax included. Or 4 interest-free payments of {formatPrice(product.price / 4)}.</p>

      <p className="mt-6 text-[15px] leading-relaxed text-ink/75">{product.description}</p>

      <div className="mt-8 space-y-7">
        {/* Colour */}
        {product.colors.length > 0 && (
          <fieldset>
            <legend className="text-sm">
              <span className="font-semibold">Colour:</span> <span className="text-muted">{color}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.colors.map((option) => (
                <label key={option.name} className="cursor-pointer" title={option.name}>
                  <input
                    type="radio"
                    name="colour"
                    value={option.name}
                    checked={color === option.name}
                    onChange={() => setColor(option.name)}
                    className="peer sr-only"
                  />
                  <span className="sr-only">{option.name}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block size-10 rounded-full ring-1 ring-inset ring-black/10 outline-2 outline-offset-[3px] transition-[outline-color]',
                      'peer-focus-visible:outline-accent',
                      color === option.name ? 'outline outline-ink' : 'outline outline-transparent hover:outline-line-strong',
                    )}
                    style={{ backgroundColor: option.hex }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Size */}
        {needsSize && (
          <fieldset ref={sizeGroupRef} aria-describedby={sizeError ? 'size-error' : undefined}>
            <div className="flex items-center justify-between">
              <legend className="text-sm">
                <span className="font-semibold">Size:</span>{' '}
                <span className={cn(size ? 'text-muted' : 'text-subtle')}>{size ?? 'Select a size'}</span>
              </legend>
              {guide && (
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium underline underline-offset-4 hover:text-muted"
                >
                  <Ruler className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  Size guide
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {product.sizes.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={size === option}
                  disabled={!product.inStock}
                  onClick={() => {
                    setSize(option);
                    setSizeError(false);
                  }}
                  className={cn(
                    'h-12 rounded-xl text-sm font-medium ring-1 ring-inset transition-colors duration-150 disabled:cursor-not-allowed disabled:text-subtle disabled:line-through',
                    size === option
                      ? 'bg-ink text-white ring-ink'
                      : sizeError
                        ? 'ring-danger/60 hover:ring-ink'
                        : 'ring-line-strong hover:ring-ink',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            {sizeError && (
              <p id="size-error" role="alert" className="mt-2.5 flex items-center gap-1.5 text-[13px] font-medium text-danger">
                <CircleAlert className="size-4" aria-hidden="true" />
                Please select a size to continue.
              </p>
            )}
          </fieldset>
        )}

        {/* Stock */}
        <p className="flex items-center gap-2 text-sm">
          <span
            className={cn('size-2 rounded-full', !product.inStock ? 'bg-subtle' : lowStock ? 'bg-sale' : 'bg-success')}
            aria-hidden="true"
          />
          {!product.inStock ? (
            <span className="text-muted">Out of stock</span>
          ) : lowStock ? (
            <span className="font-medium text-sale">Only {product.stockCount} left — order soon</span>
          ) : (
            <span>In stock, ready to ship</span>
          )}
        </p>

        {/* Actions */}
        <div ref={actionsRef}>
          {product.inStock ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <QuantitySelector value={quantity} onChange={setQuantity} max={maxQuantity} size="lg" />
                <Button size="lg" className="flex-1" onClick={handleAdd}>
                  Add to bag
                </Button>
                <button
                  type="button"
                  onClick={handleWishlist}
                  aria-pressed={saved}
                  aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                  className="inline-flex size-13 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-line-strong transition-colors hover:ring-ink"
                >
                  <Heart className={cn('size-5', saved && 'fill-sale text-sale')} strokeWidth={1.75} />
                </button>
              </div>
              <Button size="lg" variant="accent" fullWidth onClick={handleBuyNow}>
                Buy now
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                disabled={notified}
                onClick={() => {
                  setNotified(true);
                  toast({ variant: 'info', title: 'We’ll let you know', description: `You’ll get an email when ${product.name} is back.` });
                }}
              >
                {notified ? 'You’ll be notified' : 'Notify me when available'}
              </Button>
              <button
                type="button"
                onClick={handleWishlist}
                aria-pressed={saved}
                aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                className="inline-flex size-13 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-line-strong hover:ring-ink"
              >
                <Heart className={cn('size-5', saved && 'fill-sale text-sale')} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>

        {/* Delivery */}
        <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
          <li className="flex gap-3.5 p-4">
            <Truck className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold">
                {product.price >= FREE_SHIPPING_THRESHOLD ? 'Free express delivery' : `Free delivery over ${formatPrice(FREE_SHIPPING_THRESHOLD)}`}
              </p>
              <p className="mt-0.5 text-muted">Estimated arrival {deliveryWindow(2, 4)}</p>
            </div>
          </li>
          <li className="flex gap-3.5 p-4">
            <RotateCcw className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold">Free 30-day returns</p>
              <p className="mt-0.5 text-muted">Not right? Send it back free, no questions asked.</p>
            </div>
          </li>
          <li className="flex gap-3.5 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold">Secure checkout</p>
              <PaymentIcons className="mt-2 flex flex-wrap gap-1.5" />
            </div>
          </li>
        </ul>
      </div>

      <SizeGuideSheet guide={guide} open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Mobile sticky purchase bar */}
      {product.inStock && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-300 ease-out-soft lg:hidden',
            showStickyBar ? 'translate-y-0' : 'translate-y-full',
          )}
          aria-hidden={!showStickyBar}
        >
          <div className="flex items-center gap-3">
            <img
              src={imageUrl(product.images[0].src, { w: 96, h: 120 })}
              alt=""
              className="h-12 w-10 shrink-0 rounded-lg bg-surface object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{product.name}</p>
              <p className="text-[13px] tabular-nums text-muted">
                {formatPrice(product.price)}
                {size && ` · Size ${size}`}
              </p>
            </div>
            <Button onClick={handleAdd} tabIndex={showStickyBar ? 0 : -1}>
              Add to bag
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
