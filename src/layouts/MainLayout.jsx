import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnnouncementBar } from '../components/layout/AnnouncementBar';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { CartDrawer } from '../components/layout/CartDrawer';
import { MobileMenu } from '../components/layout/MobileMenu';
import { SearchPanel } from '../components/layout/SearchPanel';
import { Toaster } from '../components/ui/Toaster';
import { useUI } from '../context/UIContext';

export function MainLayout() {
  const { pathname, hash } = useLocation();
  const { close } = useUI();

  useEffect(() => {
    close();
  }, [pathname, close]);

  // New page: start at the top, or at the #section the link points to.
  // Pages load lazily, so wait briefly for the target element to appear.
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return undefined;
    }
    let attempts = 0;
    const timer = setInterval(() => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target || ++attempts > 30) {
        clearInterval(timer);
        target?.scrollIntoView({ behavior: attempts > 1 ? 'instant' : 'smooth', block: 'start' });
      }
    }, 50);
    return () => clearInterval(timer);
  }, [pathname, hash]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <MobileMenu />
      <SearchPanel />
      <Toaster />
    </div>
  );
}
