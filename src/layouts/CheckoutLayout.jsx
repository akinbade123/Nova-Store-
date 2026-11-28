import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Toaster } from '../components/ui/Toaster';

/** Distraction-free shell for checkout: no main navigation, search or bag drawer. */
export function CheckoutLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:h-[72px] lg:px-10">
          <Logo />
          <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
            <Lock className="size-4 text-ink" strokeWidth={1.75} aria-hidden="true" />
            Secure checkout
          </p>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><Link to="/help#returns" className="hover:text-ink">Refund policy</Link></li>
            <li><Link to="/help#shipping" className="hover:text-ink">Shipping</Link></li>
            <li><Link to="/legal/privacy" className="hover:text-ink">Privacy policy</Link></li>
            <li><Link to="/legal/terms" className="hover:text-ink">Terms of service</Link></li>
          </ul>
          <p>
            Need help? <a href="mailto:support@nova.store" className="font-medium text-ink hover:underline">support@nova.store</a>
          </p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
