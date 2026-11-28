import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, RotateCcw, Search, Star } from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { SmartImage } from '../ui/SmartImage';
import { imageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/format';
import { products } from '../../data/products';

const HERO_IMAGE = '1490481651871-ab68de25d43d';
const spotlight = products.find((product) => product.slug === 'moto-leather-jacket');

export function Hero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const submitSearch = (event) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop');
  };

  return (
    <section aria-labelledby="hero-heading" className="pt-3 sm:pt-4 lg:pt-6">
      <Container className="px-3 sm:px-6">
        <div className="relative isolate flex flex-col overflow-hidden rounded-[24px] bg-surface-warm lg:flex-row lg:items-center lg:min-h-[600px] lg:rounded-[32px] xl:h-[min(calc(100svh-150px),760px)]">
          {/* Photography — full-bleed on desktop, stacked below the copy on mobile */}
          <div className="relative order-2 aspect-[4/5] sm:aspect-[16/11] lg:absolute lg:inset-y-0 lg:left-[50%] lg:right-0 xl:left-[44%] lg:aspect-auto">
            <SmartImage
              src={HERO_IMAGE}
              alt="Neutral-toned shirts and knitwear hanging on a minimalist clothing rail"
              priority
              sizes="(min-width: 1440px) 1400px, 100vw"
              widths={[640, 960, 1280, 1600, 2000, 2400]}
              imgClassName="object-[72%_center] lg:object-[62%_center]"
            />
            <div
              className="absolute inset-0 hidden bg-gradient-to-r from-surface-warm via-surface-warm/0 via-40% to-transparent lg:block"
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 order-1 flex w-full flex-col px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-14 lg:w-[48%] lg:pl-14 lg:pr-6 lg:py-20 xl:pl-20">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-black/5 backdrop-blur">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              New season — Autumn/Winter ’26
            </p>
            <h1 id="hero-heading" className="mt-6 text-balance text-[clamp(2.5rem,1.4rem+3.2vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.035em]">
              Discover Your Next Favourite.
            </h1>
            <p className="mt-5 max-w-[440px] text-base leading-relaxed text-ink/70 sm:text-[17px]">
              Thoughtfully chosen electronics, fashion and home essentials — designed to be lived with and made to last.
            </p>
            <form onSubmit={submitSearch} role="search" className="mt-7 hidden w-full max-w-[460px] items-center gap-2 lg:flex">
              <label className="flex h-12 flex-1 items-center gap-3 rounded-md bg-white px-4 ring-1 ring-inset ring-line-strong transition focus-within:ring-2 focus-within:ring-ink">
                <Search className="size-[18px] shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
                <span className="sr-only">Search products</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products, categories…"
                  className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle"
                  autoComplete="off"
                  enterKeyHint="search"
                />
              </label>
              <Button type="submit" className="h-12">
                Search
              </Button>
            </form>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button to="/shop" size="lg" className="group">
                Shop Now
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Button>
              <Button to="/collections" size="lg" variant="secondary" className="bg-white/70 backdrop-blur">
                Explore Collections
              </Button>
            </div>
            <dl className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-ink/70">
              <div className="flex items-center gap-2">
                <dt className="sr-only">Customer rating</dt>
                <Star className="size-4 fill-current text-star" strokeWidth={0} aria-hidden="true" />
                <dd>
                  <span className="font-semibold text-ink">4.9/5</span> from 12,000+ reviews
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="sr-only">Returns</dt>
                <RotateCcw className="size-4 text-ink" strokeWidth={1.75} aria-hidden="true" />
                <dd>Free 30-day returns</dd>
              </div>
            </dl>
          </div>

          {/* Product spotlight — large screens only */}
          {spotlight && (
            <Link
              to={`/product/${spotlight.slug}`}
              className="group absolute bottom-8 right-8 z-10 hidden w-[340px] items-center gap-4 rounded-2xl bg-white/80 p-3 pr-4 shadow-soft ring-1 ring-black/5 backdrop-blur-xl transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-white xl:flex"
            >
              <img
                src={imageUrl(spotlight.images[0].src, { w: 144, h: 176 })}
                alt=""
                className="h-[88px] w-[72px] shrink-0 rounded-xl bg-surface object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Just landed</span>
                <span className="mt-1 block truncate text-sm font-semibold">{spotlight.name}</span>
                <span className="mt-0.5 block text-sm text-muted">{formatPrice(spotlight.price)}</span>
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          )}
        </div>
      </Container>
    </section>
  );
}
