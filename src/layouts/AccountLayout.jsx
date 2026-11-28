import { NavLink, Outlet } from 'react-router-dom';
import { Heart, LayoutGrid, LogOut, MapPin, Package, Settings } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { initials } from '../components/layout/AccountMenu';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';

const nav = [
  { label: 'Overview', to: '/account', Icon: LayoutGrid, end: true },
  { label: 'Orders', to: '/account/orders', Icon: Package },
  { label: 'Wishlist', to: '/account/wishlist', Icon: Heart },
  { label: 'Addresses', to: '/account/addresses', Icon: MapPin },
  { label: 'Settings', to: '/account/settings', Icon: Settings },
];

const memberSince = (iso) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(iso ?? Date.now()));

export function AccountLayout() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // RequireAuth sends signed-out visitors to the home page after an intentional sign-out.
  const handleSignOut = async () => {
    await signOut({ to: '/' });
    toast({ variant: 'info', title: 'You’ve been signed out' });
  };

  return (
    <Container className="pb-20 pt-8 lg:pb-28 lg:pt-12">
      <header className="flex items-center gap-4 sm:gap-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-semibold text-white sm:size-16 sm:text-xl">
          {initials(user)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">Hello, {user.firstName}</h1>
          <p className="mt-1 text-sm text-muted">Member since {memberSince(user.createdAt)}</p>
        </div>
      </header>

      <div className="mt-8 lg:mt-12 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 xl:grid-cols-[240px_1fr] xl:gap-16">
        {/* Navigation: scrollable tabs on mobile, sidebar on desktop */}
        <nav aria-label="Account" className="-mx-4 border-b border-line sm:-mx-6 lg:mx-0 lg:border-0">
          <ul className="no-scrollbar flex gap-1 overflow-x-auto px-4 sm:px-6 lg:sticky lg:top-24 lg:flex-col lg:px-0">
            {nav.map(({ label, to, Icon, end }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors',
                      'border-b-2 lg:rounded-xl lg:border-0 lg:px-4',
                      isActive
                        ? 'border-ink text-ink lg:bg-surface'
                        : 'border-transparent text-muted hover:text-ink lg:hover:bg-surface/60',
                    )
                  }
                >
                  <Icon className="hidden size-[18px] lg:block" strokeWidth={1.6} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
            <li className="hidden lg:mt-4 lg:block lg:border-t lg:border-line lg:pt-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <LogOut className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
                Sign out
              </button>
            </li>
          </ul>
        </nav>

        <div className="min-w-0 pt-8 lg:pt-0">
          <Outlet />
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-14 flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-medium text-muted ring-1 ring-inset ring-line-strong hover:text-ink lg:hidden"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </Container>
  );
}

/** Consistent heading for each account section. */
export function AccountSection({ title, description, action, children }) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h2>
          {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
