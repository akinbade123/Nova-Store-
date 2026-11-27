export const announcement = {
  id: 'free-shipping-nov-2026',
  message: 'Free express shipping on orders over $100',
  highlight: 'Black Friday: up to 30% off selected styles',
  link: { label: 'Shop the sale', to: '/shop?sort=discount' },
};

export const mainNav = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Collections', to: '/collections' },
  { label: 'About', to: '/about' },
];

export const footerLinks = {
  shop: [
    { label: 'New Arrivals', to: '/shop?sort=newest' },
    { label: 'Best Sellers', to: '/shop?sort=popular' },
    { label: 'Electronics', to: '/shop?category=electronics' },
    { label: 'Fashion', to: '/shop?category=fashion' },
    { label: 'Home & Living', to: '/shop?category=home-living' },
  ],
  company: [
    { label: 'About NOVA', to: '/about' },
    { label: 'Collections', to: '/collections' },
    { label: 'Careers', to: '/about#careers' },
    { label: 'Sustainability', to: '/about#sustainability' },
  ],
  support: [
    { label: 'Help Centre', to: '/help' },
    { label: 'Track Your Order', to: '/account/orders' },
    { label: 'Shipping & Delivery', to: '/help#shipping' },
    { label: 'Returns & Exchanges', to: '/help#returns' },
    { label: 'Contact Us', to: '/help#contact' },
  ],
};

export const FREE_SHIPPING_THRESHOLD = 100;

/**
 * A public demo: the live site runs on sample data until the API is hosted, and says so on every page.
 * Set in .env.production; vite.config.js refuses a production build that uses sample data without it.
 */
export const IS_DEMO_SITE = import.meta.env.VITE_DEMO_SITE === 'true';
