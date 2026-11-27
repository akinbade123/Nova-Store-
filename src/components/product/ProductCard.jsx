import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, ShoppingBag, X } from 'lucide-react';
import { SmartImage } from '../ui/SmartImage';
import { Badge } from '../ui/Badge';
import { Rating } from '../ui/Rating';
import { Price } from '../ui/Price';
import { WishlistButton } from './WishlistButton';
import { useQuickAdd } from './useQuickAdd';
import { categoryName } from '../../data/categories';
import { discountPercent } from '../../utils/format';
import { cn } from '../../utils/cn';

const IMAGE_RATIO = 5 / 4; // 4:5 portrait

export function ProductCard({ product, sizes = '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw', priority = false }) {
  const { add, justAdded } = useQuickAdd(product);
  const [pickingSize, setPickingSize] = useState(false);
  const href = `/product/${product.slug}`;
  const discount = discountPercent(product.price, product.compareAtPrice);
  const needsSize = product.sizes.length > 0;
  const lowStock = product.inStock && product.stockCount > 0 && product.stockCount <= 5;

  const handleQuickAdd = () => {
    if (!product.inStock) return;
    if (needsSize) setPickingSize(true);
    else add();
  };

  const chooseSize = (size) => {
    add({ size });
    setPickingSize(false);
  };

  return (
    <article className="group relative flex flex-col" aria-labelledby={`product-${product.id}`}>
      <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-surface">
        <Link to={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
          <SmartImage
            src={product.images[0].src}
            alt=""
            ratio={IMAGE_RATIO}
            sizes={sizes}
            priority={priority}
            imgClassName="transition-transform duration-700 ease-out-soft can-hover:group-hover:scale-[1.03]"
          />
          {product.images[1] && (
            <SmartImage
              src={product.images[1].src}
              zoom={product.images[1].zoom}
              alt=""
              ratio={IMAGE_RATIO}
              sizes={sizes}
              className="hidden opacity-0 transition-opacity duration-500 ease-out-soft can-hover:block can-hover:group-hover:opacity-100"
            />
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {!product.inStock && <Badge tone="muted">Sold out</Badge>}
          {product.inStock && discount > 0 && <Badge tone="sale">−{discount}%</Badge>}
          {product.inStock && product.badge && <Badge tone="light">{product.badge}</Badge>}
        </div>

        <WishlistButton product={product} className="absolute right-3 top-3" />

        {/* Desktop quick add — revealed on hover or keyboard focus */}
        {product.inStock && !pickingSize && (
          <div className="absolute inset-x-3 bottom-3 hidden translate-y-2 opacity-0 transition-[opacity,transform] duration-300 ease-out-soft can-hover:block can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100 can-hover:focus-within:translate-y-0 can-hover:focus-within:opacity-100">
            <button
              type="button"
              onClick={handleQuickAdd}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white/95 text-caption font-semibold text-ink shadow-soft backdrop-blur transition-colors duration-200 hover:bg-ink hover:text-white"
            >
              {justAdded ? <Check className="size-4" /> : <Plus className="size-4" />}
              {justAdded ? 'Added to bag' : needsSize ? 'Quick add — select size' : 'Quick add'}
              <span className="sr-only"> {product.name}</span>
            </button>
          </div>
        )}

        {/* Touch quick add — always visible */}
        {product.inStock && !pickingSize && (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Quick add ${product.name} to bag`}
            className="absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-white text-ink shadow-soft transition-transform active:scale-95 can-hover:hidden"
          >
            {justAdded ? <Check className="size-5" /> : <ShoppingBag className="size-5" strokeWidth={1.75} />}
          </button>
        )}

        {/* Size picker */}
        {pickingSize && (
          <div
            className="absolute inset-x-2 bottom-2 animate-slide-up rounded-xl bg-white/95 p-3 shadow-soft backdrop-blur sm:inset-x-3 sm:bottom-3"
            role="group"
            aria-label={`Select a size for ${product.name}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold">Select size</p>
              <button
                type="button"
                onClick={() => setPickingSize(false)}
                className="-mr-1 inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
                aria-label="Close size selection"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => chooseSize(size)}
                  className="h-8 min-w-9 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ring-line-strong transition-colors hover:bg-ink hover:text-white hover:ring-ink"
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">{categoryName(product.category)}</p>
          {product.colors.length > 1 && (
            <div className="flex items-center gap-1" aria-label={`${product.colors.length} colours available`}>
              {product.colors.map((color) => (
                <span
                  key={color.name}
                  title={color.name}
                  className="size-2.5 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          )}
        </div>
        <h3 id={`product-${product.id}`} className="mt-1 font-sans text-body font-medium leading-snug tracking-normal">
          <Link to={href} className="line-clamp-1 underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h3>
        <Rating value={product.rating} count={product.reviewCount} className="mt-1.5" />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} />
          {lowStock && <span className={cn('text-xs font-medium text-sale')}>Only {product.stockCount} left</span>}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-4/5 rounded-2xl" />
      <div className="space-y-2.5 pt-4">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-4 w-14 rounded" />
      </div>
    </div>
  );
}
