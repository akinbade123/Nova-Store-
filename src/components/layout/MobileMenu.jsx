import { Link, NavLink } from 'react-router-dom';
import { ChevronRight, Heart, LogOut, Package, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Sheet } from '../ui/Sheet';
import { Logo } from '../ui/Logo';
import { useUI } from '../../context/UIContext';
import { useWishlist } from '../../context/WishlistContext';
import { mainNav } from '../../data/site';
import { categories } from '../../data/categories';
import { imageUrl } from '../../utils/image';
import { cn } from '../../utils/cn';

export function MobileMenu() {
  const { isMenuOpen, close } = useUI();
  const { count: wishlistCount } = useWishlist();
  const { user, signOut } = useAuth();

  const accountLinks = [
    user ? { label: 'My account', to: '/account', Icon: User } : { label: 'Sign in / Register', to: '/login', Icon: User },
    { label: 'Wishlist', to: '/wishlist', Icon: Heart, count: wishlistCount },
    { label: user ? 'My orders' : 'Track an order', to: '/account/orders', Icon: Package },
  ];

  return (
    <Sheet open={isMenuOpen} onClose={close} side="left" label="Menu" title={<Logo className="text-xl" onClick={close} />} className="max-w-100">
      <nav aria-label="Mobile" className="px-5 pb-10 pt-4">
        <ul>
          {mainNav.map((item) => (
            <li key={item.to} className="border-b border-line">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={close}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between py-4 font-display text-2xl font-semibold tracking-tight',
                    isActive ? 'text-ink' : 'text-ink/70',
                  )
                }
              >
                {item.label}
                <ChevronRight className="size-5 text-subtle" strokeWidth={1.75} aria-hidden="true" />
              </NavLink>
            </li>
          ))}
        </ul>

        <p className="mb-3 mt-8 eyebrow text-muted">Shop by category</p>
        <ul className="grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link to={`/shop?category=${category.slug}`} onClick={close} className="group block">
                <div className="aspect-4/3 overflow-hidden rounded-xl bg-surface">
                  <img
                    src={imageUrl(category.image, { w: 360, h: 270 })}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </div>
                <p className="mt-2 text-sm font-medium">{category.name}</p>
              </Link>
            </li>
          ))}
        </ul>

        <ul className="mt-8 space-y-1 rounded-2xl bg-surface p-2">
          {accountLinks.map(({ label, to, Icon, count }) => (
            <li key={to}>
              <Link to={to} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-body font-medium hover:bg-white">
                <Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-2xs font-semibold text-white">{count}</span>
                )}
              </Link>
            </li>
          ))}
          {user && (
            <li>
              <button
                type="button"
                onClick={() => {
                  close();
                  signOut();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-body font-medium hover:bg-white"
              >
                <LogOut className="size-5" strokeWidth={1.6} aria-hidden="true" />
                Sign out
              </button>
            </li>
          )}
        </ul>
        {user && (
          <p className="mt-3 px-3 text-caption text-muted">
            Signed in as <span className="font-medium text-ink">{user.firstName} {user.lastName}</span>
          </p>
        )}
      </nav>
    </Sheet>
  );
}
