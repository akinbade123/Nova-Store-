import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useUI } from '../../context/UIContext';

/** Adds a product to the bag with toast feedback and a brief "Added" state. */
export function useQuickAdd(product) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { openCart } = useUI();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  const add = useCallback(
    (options = {}) => {
      addItem(product, { color: product.colors[0]?.name, ...options });
      setJustAdded(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setJustAdded(false), 1600);
      toast({
        title: 'Added to bag',
        description: [product.name, options.size && `Size ${options.size}`].filter(Boolean).join(' · '),
        image: product.images[0].src,
        action: { label: 'View bag', onClick: openCart },
      });
    },
    [addItem, product, toast, openCart],
  );

  return { add, justAdded };
}
