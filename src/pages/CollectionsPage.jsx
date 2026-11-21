import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { SmartImage } from '../components/ui/SmartImage';
import { SectionHeader } from '../components/ui/SectionHeader';
import { collections } from '../data/collections';
import { categories } from '../data/categories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { imageUrl } from '../utils/image';
import { cn } from '../utils/cn';

function CollectionCard({ collection, featured = false }) {
  return (
    <Link
      to={`/collections/${collection.slug}`}
      className={cn(
        'group relative isolate flex overflow-hidden rounded-3xl bg-ink',
        featured ? 'min-h-[460px] sm:min-h-[520px] lg:min-h-[600px]' : 'min-h-[380px] sm:min-h-[440px]',
      )}
    >
      <SmartImage
        src={collection.image}
        alt=""
        sizes={featured ? '(min-width: 1440px) 1360px, 100vw' : '(min-width: 1024px) 50vw, 100vw'}
        widths={[640, 960, 1280, 1600]}
        imgClassName="transition-transform duration-[1200ms] ease-out-soft group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" aria-hidden="true" />
      <div className="relative z-10 mt-auto flex w-full items-end justify-between gap-6 p-6 text-white sm:p-8 lg:p-10">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{collection.eyebrow}</p>
          <h2 className={cn('mt-3 font-bold leading-[1.05] tracking-tight text-white', featured ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-3xl sm:text-4xl')}>
            {collection.name}
          </h2>
          <p className={cn('mt-3 text-white/80', featured ? 'max-w-md text-base sm:text-lg' : 'text-[15px]')}>{collection.tagline}</p>
          <p className="mt-4 text-[13px] text-white/65">{collection.productIds.length} products</p>
        </div>
        <span
          className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-transform duration-300 ease-out-soft group-hover:translate-x-1 sm:flex"
          aria-hidden="true"
        >
          <ArrowRight className="size-5" />
        </span>
      </div>
    </Link>
  );
}

export default function CollectionsPage() {
  useDocumentTitle('Collections');
  const [featured, ...rest] = collections;

  return (
    <Container className="pb-20 pt-6 lg:pb-28 lg:pt-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Collections' }]} />
      <header className="mt-6 max-w-2xl lg:mt-8">
        <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">Collections</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">
          Edits put together by the NOVA team — for the season, for the way you work, and for the people on your list.
        </p>
      </header>

      <ul className="mt-10 grid gap-4 lg:mt-12 lg:grid-cols-2 lg:gap-6">
        <li className="lg:col-span-2">
          <CollectionCard collection={featured} featured />
        </li>
        {rest.map((collection) => (
          <li key={collection.slug}>
            <CollectionCard collection={collection} />
          </li>
        ))}
      </ul>

      <section aria-labelledby="by-category" className="mt-20 lg:mt-28">
        <SectionHeader id="by-category" eyebrow="Or browse" title="Shop by category" action={{ label: 'Shop everything', to: '/shop' }} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link to={`/shop?category=${category.slug}`} className="group flex items-center gap-4 rounded-2xl bg-surface p-3 pr-4 transition-colors hover:bg-line">
                <img src={imageUrl(category.image, { w: 128, h: 128 })} alt="" loading="lazy" className="size-14 shrink-0 rounded-xl object-cover sm:size-16" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold sm:text-[15px]">{category.name}</span>
                  <span className="hidden truncate text-[13px] text-muted sm:block">{category.tagline}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
