import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { DemoBanner } from './components/layout/DemoBanner';
import { AppProviders } from './context/AppProviders';
import { MainLayout } from './layouts/MainLayout';
import { CheckoutLayout } from './layouts/CheckoutLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { AccountLayout } from './layouts/AccountLayout';
import { RequireAuth } from './components/account/RequireAuth';
import HomePage from './pages/HomePage';

const ShopPage = lazy(() => import('./pages/ShopPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AccountOverviewPage = lazy(() => import('./pages/account/AccountOverviewPage'));
const OrdersPage = lazy(() => import('./pages/account/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/account/OrderDetailPage'));
const AccountWishlistPage = lazy(() => import('./pages/account/AccountWishlistPage'));
const AddressesPage = lazy(() => import('./pages/account/AddressesPage'));
const SettingsPage = lazy(() => import('./pages/account/SettingsPage'));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageFallback() {
  return <div className="min-h-[60vh]" aria-busy="true" />;
}

/** One error boundary for every page, reset whenever the page changes. */
function PageErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <DemoBanner />
        <PageErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="shop" element={<ShopPage />} />
                <Route path="product/:slug" element={<ProductPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route
                  path="account"
                  element={
                    <RequireAuth>
                      <AccountLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<AccountOverviewPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="wishlist" element={<AccountWishlistPage />} />
                  <Route path="addresses" element={<AddressesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="collections" element={<CollectionsPage />} />
                <Route path="collections/:slug" element={<CollectionPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="help" element={<HelpPage />} />
                {/* Not under AuthLayout: it redirects signed-in users away, and this link is often opened signed in. */}
                <Route path="verify-email" element={<VerifyEmailPage />} />
                <Route path="legal" element={<Navigate to="/legal/privacy" replace />} />
                <Route path="legal/:doc" element={<LegalPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              <Route element={<AuthLayout />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
              </Route>
              <Route element={<CheckoutLayout />}>
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="checkout/confirmation/:orderId" element={<OrderConfirmationPage />} />
              </Route>
            </Routes>
          </Suspense>
        </PageErrorBoundary>
      </AppProviders>
    </BrowserRouter>
  );
}
