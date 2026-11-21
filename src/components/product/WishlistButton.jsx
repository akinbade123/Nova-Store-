import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../utils/cn';

export function WishlistButton({ product, className }) {
  const { has, toggle } = useWishlist();
  const { toast } = useToast();
  const navigate = useNavigate();
  const saved = has(product.id);

  const handleClick = () => {
    const added = toggle(product.id);
    toast({
      title: added ? 'Saved to wishlist' : 'Removed from wishlist',
      description: product.name,
      image: product.images[0].src,
      action: added ? { label: 'View', onClick: () => navigate('/wishlist') } : undefined,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur',
        'transition-[transform,background-color] duration-200 hover:scale-105 hover:bg-white active:scale-95',
        className,
      )}
    >
      <Heart
        className={cn('size-[17px] transition-colors duration-200', saved && 'fill-sale text-sale')}
        strokeWidth={1.75}
      />
    </button>
  );
}
