import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Heart, ShoppingBag, X } from 'lucide-react';
import { SmartImage } from '../ui/SmartImage';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Price } from '../ui/Price';
import { Rating } from '../ui/Rating';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useUI } from '../../context/UIContext';
import { productService } from '../../services/productService';
import { categoryName } from '../../data/categories';
import { discountPercent } from '../../utils/format';
import { cn } from '../../utils/cn';

function WishlistItem({ product }) {
  const { remove, restore } = useWishlist();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { openCart } = useUI();
  const [size, setSize] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);

  const href = `/product/${product.slug}`;
  const discount = discountPercent(product.price, product.compareAtPrice);
  const needsSize = product.sizes.length > 0;
  const selectId = `wishlist-size-${product.id}`;

  const handleRemove = () => {
    const index = remove(product.id);
    toast({
      title: 'Removed from wishlist',
      description: product.name,
      image: product.images[0].src,
      action: { label: 'Undo', onClick: () => restore(product.id, index) },
      duration: 6000,
    });
  };

  const handleAdd = () => {
    if (needsSize && !size) {
      setSizeError(true);
      document.getElementById(selectId)?.focus();
      return;
    }
    addItem(product, { color: product.colors[0]?.name, size: size || undefined });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    toast({
      title: 'Added to bag',
      description: [product.name, size && `Size ${size}`].filter(Boolean).join(' · '),
      image: product.images[0].src,
      action: { label: 'View bag', onClick: openCart },
    });
  };

  return (
    <li className="flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
        <Link to={href} tabIndex={-1} aria-hidden="true" className="group absolute inset-0">
          <SmartImage
            src={product.images[0].src}
            alt=""
            ratio={5 / 4}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
            imgClassName={cn(
              'transition-transform duration-700 ease-out-soft can-hover:group-hover:scale-[1.03]',
              !product.inStock && 'opacity-60 grayscale-[30%]',
            )}
          />
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {!product.inStock ? <Badge tone="muted">Sold out</Badge> : discount > 0 && <Badge tone="sale">−{discount}%</Badge>}
        </div>
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Remove ${product.name} from wishlist`}
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-white/90 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur transition-transform hover:scale-105 active:scale-95"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <p className="text-xs text-muted">{categoryName(product.category)}</p>
        <h3 className="mt-1 font-sans text-[15px] font-medium leading-snug tracking-normal">
          <Link to={href} className="line-clamp-1 underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h3>
        <Rating value={product.rating} count={product.reviewCount} className="mt-1.5" />
        <Price price={product.price} compareAtPrice={product.compareAtPrice} className="mt-2" />

        <div className="mt-auto space-y-2 pt-4">
          {needsSize && product.inStock && (
            <div>
              <label htmlFor={selectId} className="sr-only">
                Size for {product.name}
              </label>
              <div className="relative">
                <select
                  id={selectId}
                  value={size}
                  onChange={(event) => {
                    setSize(event.target.value);
                    setSizeError(false);
                  }}
                  aria-invalid={sizeError}
                  aria-describedby={sizeError ? `${selectId}-error` : undefined}
                  className={cn(
                    'h-10 w-full cursor-pointer appearance-none rounded-full bg-white pl-4 pr-9 text-[13px] font-medium outline-none ring-1 ring-inset focus-visible:ring-2',
                    sizeError ? 'ring-danger' : 'ring-line-strong hover:ring-ink focus-visible:ring-ink',
                    !size && 'text-muted',
                  )}
                >
                  <option value="">Select size</option>
                  {product.sizes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              </div>
              {sizeError && (
                <p id={`${selectId}-error`} className="mt-1.5 text-xs font-medium text-danger">
                  Choose a size first
                </p>
              )}
            </div>
          )}
          {product.inStock ? (
            <Button size="sm" fullWidth className="h-10" onClick={handleAdd}>
              {added ? <Check className="size-4" aria-hidden="true" /> : <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden="true" />}
              {added ? 'Added' : 'Add to bag'}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" fullWidth className="h-10" to={`/shop?category=${product.category}`}>
              Shop similar
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Saved products with remove, size choice and add-to-bag. Renders `empty` when nothing is saved. */
export function WishlistGrid({ empty, columns = 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' }) {
  const { ids } = useWishlist();
  // Newest saves first.
  const products = [...ids].reverse().map((id) => productService.findById(id)).filter(Boolean);

  if (products.length === 0) {
    return (
      empty ?? (
        <div className="flex flex-col items-center rounded-3xl bg-surface px-6 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white">
            <Heart className="size-7" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="mt-5 font-display text-xl font-semibold">Your wishlist is empty</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Tap the heart on any product to save it here for later.
          </p>
          <Button to="/shop" className="mt-7">
            Discover products
          </Button>
        </div>
      )
    );
  }

  return <ul className={cn('grid gap-x-3 gap-y-10 sm:gap-x-5 lg:gap-x-6', columns)}>{products.map((product) => <WishlistItem key={product.id} product={product} />)}</ul>;
}
