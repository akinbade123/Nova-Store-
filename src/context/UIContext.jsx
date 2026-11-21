import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext(null);

/** Global overlays: cart drawer, search panel and mobile menu. Only one is open at a time. */
export function UIProvider({ children }) {
  const [overlay, setOverlay] = useState(null); // 'cart' | 'search' | 'menu' | null

  const open = useCallback((name) => setOverlay(name), []);
  const close = useCallback(() => setOverlay(null), []);

  const value = useMemo(
    () => ({
      overlay,
      isCartOpen: overlay === 'cart',
      isSearchOpen: overlay === 'search',
      isMenuOpen: overlay === 'menu',
      openCart: () => open('cart'),
      openSearch: () => open('search'),
      openMenu: () => open('menu'),
      close,
    }),
    [overlay, open, close],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used inside <UIProvider>');
  return context;
}
