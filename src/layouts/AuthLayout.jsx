import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { SmartImage } from '../components/ui/SmartImage';
import { Toaster } from '../components/ui/Toaster';
import { useAuth } from '../context/AuthContext';

const perks = [
  'Track orders and manage returns in one place',
  'Check out faster with your saved addresses',
  'Early access to new arrivals and member offers',
];

/** Where to go after signing in: ?redirect=/path (same-origin paths only) or the account page. */
export function useRedirectTarget() {
  const { search } = useLocation();
  const target = new URLSearchParams(search).get('redirect');
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/account';
}

/** Split-screen shell for sign in, registration and password reset. */
export function AuthLayout() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const redirect = useRedirectTarget();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  // Signed-in shoppers don't need these pages.
  if (isAuthenticated) return <Navigate to={redirect} replace />;

  return (
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-5 sm:px-10 lg:px-14 xl:px-20">
        <header className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="inline-flex items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to store
          </Link>
        </header>

        <main id="main" className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12 lg:py-16">
          <Outlet />
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <p>© {new Date().getFullYear()} NOVA Commerce Ltd.</p>
          <ul className="flex gap-4">
            <li><Link to="/legal/privacy" className="hover:text-ink">Privacy</Link></li>
            <li><Link to="/legal/terms" className="hover:text-ink">Terms</Link></li>
            <li><Link to="/help" className="hover:text-ink">Help</Link></li>
          </ul>
        </footer>
      </div>

      <aside className="relative hidden p-4 lg:block" aria-hidden="true">
        <div className="sticky top-4 h-[calc(100dvh-2rem)] overflow-hidden rounded-[28px] bg-ink">
          <SmartImage
            src="1445205170230-053b83016050"
            alt=""
            sizes="50vw"
            widths={[800, 1200, 1600]}
            imgClassName="object-[60%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
            <p className="eyebrow text-white/70">NOVA Members</p>
            <p className="mt-4 max-w-md font-display text-4xl font-bold leading-[1.08] tracking-tight xl:text-5xl">
              Everything you love, in one place.
            </p>
            <ul className="mt-8 space-y-3">
              {perks.map((perk) => (
                <li key={perk} className="flex items-center gap-3 text-body text-white/85">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <Toaster />
    </div>
  );
}
