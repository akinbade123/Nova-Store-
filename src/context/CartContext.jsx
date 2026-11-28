import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useProducts } from '../hooks/useProducts';
import { productService } from '../services/productService';
import { cartService } from '../services/cartService';
import { computeTotals } from '../utils/pricing';
import { FREE_SHIPPING_THRESHOLD } from '../data/site';

const CartContext = createContext(null);

const MAX_PER_LINE = 10;
const lineKey = (productId, options = {}) => [productId, options.color ?? '', options.size ?? ''].join('|');

/** Highest quantity allowed for a product: limited by stock and a per-line cap. */
export const maxQuantityFor = (product) => Math.max(1, Math.min(MAX_PER_LINE, product?.stockCount ?? MAX_PER_LINE));

export function CartProvider({ children }) {
  // Persist only identifiers and quantities; product details are resolved on read
  // so prices stay current once they come from the API.
  const [lines, setLines] = useLocalStorage('nova:cart', []);
  const [promo, setPromo] = useLocalStorage('nova:promo', null);
  // Resolves line product ids through the product cache, fetching any that aren't loaded yet.
  const { products: lineProducts, loading } = useProducts(lines.map((line) => line.productId));

  const addItem = useCallback(
    (product, { quantity = 1, color, size } = {}) => {
      const key = lineKey(product.id, { color, size });
      const max = maxQuantityFor(product);
      setLines((current) => {
        const existing = current.find((line) => line.key === key);
        if (existing) {
          return current.map((line) =>
            line.key === key ? { ...line, quantity: Math.min(line.quantity + quantity, max) } : line,
          );
        }
        return [...current, { key, productId: product.id, quantity: Math.min(quantity, max), color, size }];
      });
    },
    [setLines],
  );

  const updateQuantity = useCallback(
    (key, quantity) => {
      setLines((current) =>
        quantity <= 0
          ? current.filter((line) => line.key !== key)
          : current.map((line) => {
              if (line.key !== key) return line;
              const max = maxQuantityFor(productService.findById(line.productId));
              return { ...line, quantity: Math.min(quantity, max) };
            }),
      );
    },
    [setLines],
  );

  /** Removes a line and returns what is needed to undo it. */
  const removeItem = useCallback(
    (key) => {
      const index = lines.findIndex((line) => line.key === key);
      const removed = lines[index];
      setLines((current) => current.filter((line) => line.key !== key));
      return removed ? { line: removed, index } : null;
    },
    [lines, setLines],
  );

  const restoreItem = useCallback(
    ({ line, index }) =>
      setLines((current) => {
        if (current.some((item) => item.key === line.key)) return current;
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, line);
        return next;
      }),
    [setLines],
  );

  const clear = useCallback(() => {
    setLines([]);
    setPromo(null);
  }, [setLines, setPromo]);

  const value = useMemo(() => {
    const byId = new Map(lineProducts.map((product) => [product.id, product]));
    const items = lines.map((line) => ({ ...line, product: byId.get(line.productId) })).filter((line) => line.product);
    const count = items.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = items.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
    const savings = items.reduce(
      (sum, line) =>
        sum + (line.product.compareAtPrice ? (line.product.compareAtPrice - line.product.price) * line.quantity : 0),
      0,
    );
    const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);

    const applyPromo = async (code) => {
      const result = await cartService.validatePromo(code, subtotal);
      setPromo(result);
      return result;
    };

    return {
      items,
      /** True while product details for the bag are still loading (API mode only). */
      loading,
      count,
      subtotal,
      savings,
      amountToFreeShipping,
      promo,
      applyPromo,
      removePromo: () => setPromo(null),
      /** Totals for a given shipping method (checkout passes the chosen one). */
      getTotals: (shippingMethodId) => computeTotals({ subtotal, promo, shippingMethodId }),
      addItem,
      updateQuantity,
      removeItem,
      restoreItem,
      clear,
    };
  }, [lines, lineProducts, loading, promo, setPromo, addItem, updateQuantity, removeItem, restoreItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
