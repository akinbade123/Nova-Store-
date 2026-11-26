import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useUI } from '../../context/UIContext';
import { productService } from '../../services/productService';

/** Re-adds an order's items to the bag, skipping anything no longer available. */
export function useBuyAgain() {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { openCart } = useUI();

  return async (items) => {
    // Make sure current product details (stock, price) are loaded before re-adding.
    await productService.loadByIds(items.map((item) => item.productId));
    let added = 0;
    const unavailable = [];
    items.forEach((item) => {
      const product = productService.findById(item.productId);
      if (!product || !product.inStock) {
        unavailable.push(item.name);
        return;
      }
      addItem(product, { quantity: item.quantity, color: item.color ?? undefined, size: item.size ?? undefined });
      added += 1;
    });

    if (added === 0) {
      toast({ variant: 'error', title: 'Not available right now', description: unavailable.join(', ') });
      return;
    }
    toast({
      title: added === 1 ? 'Added to bag' : `${added} items added to bag`,
      description: unavailable.length ? `${unavailable.join(', ')} is out of stock` : undefined,
      action: { label: 'View bag', onClick: openCart },
    });
  };
}
