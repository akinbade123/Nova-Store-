import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { QuantitySelector } from '../ui/QuantitySelector';
import { useCart, maxQuantityFor } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { categoryName } from '../../data/categories';
import { formatPrice } from '../../utils/format';
import { imageUrl } from '../../utils/image';

export function CartLineItem({ item }) {
  const { product, quantity, color, size, key } = item;
  const { updateQuantity, removeItem, restoreItem } = useCart();
  const { has, toggle } = useWishlist();
  const { toast } = useToast();

  const href = `/product/${product.slug}`;
  const max = maxQuantityFor(product);
  const lowStock = product.stockCount <= 5;
  const variant = [color, size && `Size ${size}`].filter(Boolean).join(' · ');

  const handleRemove = () => {
    const removed = removeItem(key);
    toast({
      title: 'Removed from bag',
      description: product.name,
      image: product.images[0].src,
      action: removed ? { label: 'Undo', onClick: () => restoreItem(removed) } : undefined,
      duration: 6000,
    });
  };

  const handleSaveForLater = () => {
    if (!has(product.id)) toggle(product.id);
    removeItem(key);
    toast({ title: 'Moved to wishlist', description: product.name, image: product.images[0].src });
  };

  return (
    <li className="flex gap-4 py-6 sm:gap-6">
      <Link to={href} className="relative block aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl bg-surface sm:w-32">
        <img
          src={imageUrl(product.images[0].src, { w: 256, h: 320 })}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 hover:scale-[1.03]"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted">{categoryName(product.category)}</p>
            <h3 className="mt-0.5 font-sans text-body font-semibold leading-snug tracking-normal">
              <Link to={href} className="underline-offset-4 hover:underline">
                {product.name}
              </Link>
            </h3>
            {variant && <p className="mt-1 text-caption text-muted">{variant}</p>}
            <p className="mt-1 text-caption tabular-nums">
              {formatPrice(product.price)}
              {product.compareAtPrice > product.price && (
                <s className="ml-1.5 text-muted">{formatPrice(product.compareAtPrice)}</s>
              )}
              {quantity > 1 && <span className="text-muted"> each</span>}
            </p>
          </div>
          <p className="shrink-0 text-body font-semibold tabular-nums" aria-label={`Line total ${formatPrice(product.price * quantity)}`}>
            {formatPrice(product.price * quantity)}
          </p>
        </div>

        {lowStock && <p className="mt-2 text-xs font-medium text-sale">Only {product.stockCount} left in stock</p>}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <QuantitySelector
            value={quantity}
            max={max}
            min={1}
            onChange={(value) => updateQuantity(key, value)}
            label={`Quantity for ${product.name}`}
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSaveForLater}
<<<<<<< HEAD
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] text-muted transition-colors hover:bg-surface hover:text-ink"
=======
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-caption text-muted transition-colors hover:bg-surface hover:text-ink"
>>>>>>> 2ee02a475115790a889c400c3730454a436cc71e
            >
              <Heart className="size-4" strokeWidth={1.75} aria-hidden="true" />
              <span className="hidden sm:inline">Save for later</span>
              <span className="sr-only sm:hidden">Save {product.name} for later</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
<<<<<<< HEAD
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] text-muted transition-colors hover:bg-surface hover:text-danger"
=======
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-caption text-muted transition-colors hover:bg-surface hover:text-danger"
>>>>>>> 2ee02a475115790a889c400c3730454a436cc71e
            >
              <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
              <span className="hidden sm:inline">Remove</span>
              <span className="sr-only sm:hidden">Remove {product.name}</span>
            </button>
          </div>
        </div>
        {quantity >= max && max < 10 && (
          <p className="mt-2 text-xs text-muted">That’s all we have in stock right now.</p>
        )}
      </div>
    </li>
  );
}
