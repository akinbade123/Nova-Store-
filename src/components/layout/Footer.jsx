import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail, Phone } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Container } from '../ui/Container';
import { FacebookIcon, InstagramIcon, PaymentIcons, TikTokIcon, XIcon, YouTubeIcon } from '../ui/BrandIcons';
import { footerLinks } from '../../data/site';
import { cn } from '../../utils/cn';

const socials = [
  { label: 'Instagram', href: 'https://instagram.com', Icon: InstagramIcon },
  { label: 'TikTok', href: 'https://tiktok.com', Icon: TikTokIcon },
  { label: 'X', href: 'https://x.com', Icon: XIcon },
  { label: 'Facebook', href: 'https://facebook.com', Icon: FacebookIcon },
  { label: 'YouTube', href: 'https://youtube.com', Icon: YouTubeIcon },
];

function FooterColumn({ title, links }) {
  const [open, setOpen] = useState(false);
  const id = `footer-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="border-b border-white/10 md:border-0">
      <h3 className="font-sans text-sm font-semibold tracking-normal text-white">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between py-4 text-left md:pointer-events-none md:py-0"
        >
          {title}
          <ChevronDown
            className={cn('size-4 text-white/60 transition-transform duration-300 md:hidden', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </h3>
      <ul id={id} className={cn('space-y-3 pb-5 md:mt-5 md:block md:pb-0', open ? 'block' : 'hidden')}>
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className="text-sm text-white/65 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <Container className="pb-8 pt-14 lg:pt-20">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-12 lg:col-span-4">
            <Logo inverse />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">
              NOVA brings together considered electronics, fashion, accessories and home goods — chosen for quality,
              built to last, and delivered with care.
            </p>
            <ul className="mt-6 flex items-center gap-2" aria-label="NOVA on social media">
              {socials.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`NOVA on ${label}`}
                    className="inline-flex size-10 items-center justify-center rounded-full bg-white/[0.07] text-white/80 transition-colors hover:bg-white hover:text-ink"
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-8 md:grid md:grid-cols-3 md:gap-8 lg:col-span-5">
            <FooterColumn title="Shop" links={footerLinks.shop} />
            <FooterColumn title="Company" links={footerLinks.company} />
            <FooterColumn title="Customer support" links={footerLinks.support} />
          </div>

          <div className="md:col-span-4 lg:col-span-3">
            <h3 className="font-sans text-sm font-semibold tracking-normal text-white">Need help?</h3>
            <p className="mt-5 text-sm leading-relaxed text-white/65">Our team is here Monday to Saturday, 8am – 8pm.</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href="mailto:support@nova.store" className="inline-flex items-center gap-2.5 text-white/85 hover:text-white">
                  <Mail className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  support@nova.store
                </a>
              </li>
              <li>
                <a href="tel:+18005550199" className="inline-flex items-center gap-2.5 text-white/85 hover:text-white">
                  <Phone className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  +1 (800) 555-0199
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-8 lg:mt-16 lg:flex-row lg:items-center lg:justify-between">
          <PaymentIcons className="flex flex-wrap items-center gap-2" />
          <div className="flex flex-col gap-3 text-caption text-white/50 sm:flex-row sm:items-center sm:gap-6">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <li><Link to="/legal/privacy" className="hover:text-white">Privacy</Link></li>
              <li><Link to="/legal/terms" className="hover:text-white">Terms</Link></li>
              <li><Link to="/legal/cookies" className="hover:text-white">Cookies</Link></li>
            </ul>
            <p>© {new Date().getFullYear()} NOVA Commerce Ltd. All rights reserved.</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
