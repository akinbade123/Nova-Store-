import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [ids, setIds] = useLocalStorage('nova:wishlist', []);
  // Always-current list, so callbacks held by toasts (e.g. "Undo") never act on stale state.
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const has = useCallback((id) => ids.includes(id), [ids]);

  /** Returns true when the product was added, false when removed. */
  const toggle = useCallback(
    (id) => {
      const adding = !idsRef.current.includes(id);
      setIds((current) => (adding ? [...current, id] : current.filter((item) => item !== id)));
      return adding;
    },
    [setIds],
  );

  /** Removes an item and returns its position so it can be restored. */
  const remove = useCallback(
    (id) => {
      const index = idsRef.current.indexOf(id);
      setIds((current) => current.filter((item) => item !== id));
      return index;
    },
    [setIds],
  );

  /** Puts a removed item back where it was (used by "Undo"). */
  const restore = useCallback(
    (id, index = -1) =>
      setIds((current) => {
        if (current.includes(id)) return current;
        const next = [...current];
        next.splice(index < 0 ? next.length : Math.min(index, next.length), 0, id);
        return next;
      }),
    [setIds],
  );

  const value = useMemo(() => ({ ids, count: ids.length, has, toggle, remove, restore }), [ids, has, toggle, remove, restore]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return context;
}
