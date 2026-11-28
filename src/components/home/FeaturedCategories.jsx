import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { SmartImage } from '../ui/SmartImage';
import { categories } from '../../data/categories';
import { productService } from '../../services/productService';
import { useAsync } from '../../hooks/useAsync';

export function FeaturedCategories() {
  // One request: the catalogue's facets carry a product count per category.
  const { data } = useAsync(() => productService.query({ limit: 1 }), []);
  const counts = data?.facets?.categories;

  return (
    <section aria-labelledby="categories-heading" className="py-16 lg:py-24">
      <Container>
        <SectionHeader
          id="categories-heading"
          eyebrow="Shop by category"
          title="Find what moves you"
          action={{ label: 'Browse all', to: '/collections' }}
        />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/shop?category=${category.slug}`}
                className="group relative block aspect-3/4 overflow-hidden rounded-2xl bg-surface sm:aspect-[4/5] lg:aspect-[3/4]"
              >
                <SmartImage
                  src={category.image}
                  alt=""
                  ratio={4 / 3}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  imgClassName="transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-6">
                  <div className="min-w-0">
                    <p className="hidden text-xs text-white/75 sm:block">{category.tagline}</p>
                    <h3 className="font-display text-lg font-semibold leading-tight text-white sm:mt-1 sm:text-2xl">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-xs text-white/75">{counts?.[category.slug] != null ? `${counts[category.slug]} products` : '\u00a0'}</p>
                  </div>
                  <span
                    className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-transform duration-300 ease-out-soft group-hover:translate-x-0.5 sm:flex"
                    aria-hidden="true"
                  >
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
