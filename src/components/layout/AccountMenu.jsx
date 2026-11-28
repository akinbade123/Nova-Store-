import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, LogOut, Package, User } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../utils/cn';

export const initials = (user) => `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

const links = [
  { label: 'My account', to: '/account', Icon: User },
  { label: 'Orders', to: '/account/orders', Icon: Package },
  { label: 'Wishlist', to: '/wishlist', Icon: Heart },
];

/** Navbar account control: sign-in link when signed out, menu with sign-out when signed in. */
export function AccountMenu({ className }) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <IconButton label="Sign in" to="/login" className={className}>
        <User className="size-[21px]" strokeWidth={1.6} />
      </IconButton>
    );
  }

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    toast({ variant: 'info', title: 'You’ve been signed out' });
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${user.firstName}`}
        className="inline-flex size-10 items-center justify-center rounded-md transition-colors hover:bg-surface"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-ink text-2xs font-semibold tracking-wide text-white">
          {initials(user)}
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-50 mt-2 w-64 animate-slide-down rounded-2xl bg-white p-2 shadow-lift ring-1 ring-line"
        >
          <div className="px-3 pb-3 pt-2">
            <p className="text-sm font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-caption text-muted">{user.email}</p>
          </div>
          <ul className="border-t border-line pt-1.5">
            {links.map(({ label, to, Icon }) => (
              <li key={to}>
                <Link to={to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface">
                  <Icon className="size-[18px] text-muted" strokeWidth={1.6} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 border-t border-line pt-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface"
            >
              <LogOut className="size-[18px] text-muted" strokeWidth={1.6} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
