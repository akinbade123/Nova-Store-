import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ProductCarousel } from '../components/product/ProductCarousel';
import { WishlistGrid } from '../components/wishlist/WishlistGrid';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { productService } from '../services/productService';

function PopularPicks({ excludeIds }) {
  const { data, loading } = useAsync(() => productService.list({ sort: 'popular', limit: 14 }), []);
  const products = (data ?? []).filter((product) => !excludeIds.includes(product.id)).slice(0, 8);

  return (
    <section aria-labelledby="picks-heading" className="overflow-hidden border-t border-line py-16 lg:py-24">
      <Container>
        <ProductCarousel
          products={products}
          loading={loading}
          label="Popular right now"
          renderHeader={(controls) => (
            <SectionHeader
              id="picks-heading"
              eyebrow="Need inspiration?"
              title="Popular right now"
              actions={<div className="hidden sm:block">{controls}</div>}
            />
          )}
        />
      </Container>
    </section>
  );
}

export default function WishlistPage() {
  useDocumentTitle('Wishlist');
  const { ids, count } = useWishlist();
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Container className="pb-16 pt-6 lg:pb-24 lg:pt-10">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 lg:mt-8">
          <div>
            <h1 className="text-[34px] font-bold leading-none tracking-[-0.03em] sm:text-5xl">
              Wishlist {count > 0 && <span className="text-2xl font-semibold text-muted sm:text-3xl">({count})</span>}
            </h1>
            <p className="mt-3 text-[15px] text-muted">Pieces you’ve saved for later. Prices and stock update live.</p>
          </div>
          {count > 0 && (
            <Button to="/shop" variant="secondary">
              Continue shopping
            </Button>
          )}
        </div>

        {!isAuthenticated && count > 0 && (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3 text-sm">
              <Heart className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>
                <span className="font-semibold">Don’t lose your favourites.</span>{' '}
                <span className="text-muted">Sign in to keep your wishlist across devices.</span>
              </span>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button to="/login?redirect=/wishlist" size="sm">
                Sign in
              </Button>
              <Button to="/register?redirect=/wishlist" size="sm" variant="secondary">
                Create account
              </Button>
            </div>
          </div>
        )}

        <div className="mt-10">
          <WishlistGrid
            empty={
              <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center lg:py-16">
                <span className="flex size-20 items-center justify-center rounded-full bg-surface">
                  <Heart className="size-8" strokeWidth={1.4} aria-hidden="true" />
                </span>
                <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">Nothing saved yet</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  Tap the heart on any product and it will be waiting for you here.{' '}
                  {!isAuthenticated && (
                    <>
                      <Link to="/login?redirect=/wishlist" className="font-medium text-ink underline underline-offset-4">
                        Sign in
                      </Link>{' '}
                      to see items saved on other devices.
                    </>
                  )}
                </p>
                <Button to="/shop" size="lg" className="mt-8">
                  Start exploring
                </Button>
              </div>
            }
          />
        </div>
      </Container>
      <PopularPicks excludeIds={ids} />
    </>
  );
}
