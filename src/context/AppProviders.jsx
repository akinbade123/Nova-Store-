import { ToastProvider } from './ToastContext';
import { UIProvider } from './UIContext';
import { CartProvider } from './CartContext';
import { WishlistProvider } from './WishlistContext';
import { AuthProvider } from './AuthContext';

export function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <UIProvider>
          <WishlistProvider>
            <CartProvider>{children}</CartProvider>
          </WishlistProvider>
        </UIProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
