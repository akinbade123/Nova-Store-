import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag } from 'lucide-react';
import { AccountMenu } from './AccountMenu';
import { Logo } from '../ui/Logo';
import { IconButton } from '../ui/IconButton';
import { mainNav } from '../../data/site';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useUI } from '../../context/UIContext';
import { cn } from '../../utils/cn';

const iconProps = { className: 'size-[21px]', strokeWidth: 1.6 };

export function Navbar() {
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { openCart, openSearch, openMenu } = useUI();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-white/90 backdrop-blur-xl backdrop-saturate-150 transition-[border-color,box-shadow] duration-300',
        scrolled ? 'border-line shadow-[0_1px_12px_rgb(0_0_0/0.03)]' : 'border-transparent',
      )}
    >
      <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-2 sm:px-4 lg:h-[72px] lg:px-10">
        {/* Left: mobile controls / desktop logo */}
        <div className="flex items-center">
          <IconButton label="Open menu" onClick={openMenu} className="lg:hidden">
            <Menu {...iconProps} />
          </IconButton>
          <IconButton label="Search" onClick={openSearch} className="lg:hidden">
            <Search {...iconProps} />
          </IconButton>
          <Logo className="hidden lg:block" />
        </div>

        {/* Centre: mobile logo / desktop navigation */}
        <Logo className="lg:hidden" />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'relative inline-flex h-10 items-center px-4 text-[14px] font-medium transition-colors duration-200',
                      'after:absolute after:inset-x-4 after:bottom-1 after:h-[1.5px] after:origin-left after:bg-ink after:transition-transform after:duration-300',
                      isActive ? 'text-ink after:scale-x-100' : 'text-muted after:scale-x-0 hover:text-ink',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right: actions */}
        <div className="flex items-center justify-end gap-0.5">
          <IconButton label="Search" onClick={openSearch} className="max-lg:hidden">
            <Search {...iconProps} />
          </IconButton>
          <AccountMenu className="max-lg:hidden" />
          <IconButton label="Wishlist" to="/wishlist" count={wishlistCount} className="max-sm:hidden">
            <Heart {...iconProps} />
          </IconButton>
          <IconButton label="Shopping bag" onClick={openCart} count={cartCount}>
            <ShoppingBag {...iconProps} />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
