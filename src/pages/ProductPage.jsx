import { useParams } from 'react-router-dom';
import { PackageX } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ProductCarousel } from '../components/product/ProductCarousel';
import { ProductGallery } from '../components/pdp/ProductGallery';
import { ProductPurchase } from '../components/pdp/ProductPurchase';
import { ProductAccordion } from '../components/pdp/ProductAccordion';
import { ProductReviews } from '../components/pdp/ProductReviews';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { productService } from '../services/productService';
import { categoryName } from '../data/categories';
import { discountPercent } from '../utils/format';

function ProductSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16" aria-busy="true" aria-label="Loading product">
      <div className="lg:col-span-7 lg:grid lg:grid-cols-[76px_1fr] lg:gap-4 xl:grid-cols-[88px_1fr] xl:gap-5">
        <div className="hidden flex-col gap-3 lg:flex">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton aspect-[4/5] rounded-xl" />)}
        </div>
        <div className="skeleton aspect-[4/5] rounded-2xl lg:rounded-3xl" />
      </div>
      <div className="space-y-4 lg:col-span-5 lg:pt-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-6 h-8 w-32" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/5" />
        <div className="flex gap-3 pt-6">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 flex-1 rounded-xl" />)}
        </div>
        <Skeleton className="mt-4 h-13 w-full rounded-full" />
        <Skeleton className="h-13 w-full rounded-full" />
      </div>
    </div>
  );
}

function RelatedProducts({ product }) {
  const { data, loading } = useAsync(() => productService.related(product), [product.id]);
  if (!loading && !data?.length) return null;

  return (
    <section aria-labelledby="related-heading" className="overflow-hidden border-t border-line py-16 lg:py-24">
      <Container>
        <ProductCarousel
          products={data ?? []}
          loading={loading}
          label="You may also like"
          renderHeader={(controls) => (
            <SectionHeader
              id="related-heading"
              eyebrow="Complete the look"
              title="You may also like"
              actions={<div className="hidden sm:block">{controls}</div>}
            />
          )}
        />
      </Container>
    </section>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const { data, loading, error, retry } = useAsync(() => productService.getDetail(slug), [slug]);

  // Ignore the previous product while a new one loads (e.g. clicking a related item).
  const product = data?.slug === slug ? data : null;
  const pending = loading || (data && !product);

  useDocumentTitle(product?.name ?? (pending ? 'Loading' : 'Product not found'));

  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    ...(product
      ? [
          { label: categoryName(product.category), to: `/shop?category=${product.category}` },
          { label: product.name },
        ]
      : []),
  ];

  if (error) {
    return (
      <Container className="py-16">
        <ErrorState message={error.userMessage ?? 'We couldn’t load this product.'} onRetry={retry} />
      </Container>
    );
  }

  if (!pending && !product) {
    return (
      <Container className="py-16 lg:py-24">
        <EmptyState
          icon={PackageX}
          title="We can’t find that product"
          message="It may have sold out for good or the link might be out of date. Take a look at what’s new instead."
          action={{ label: 'Browse the shop', to: '/shop' }}
        />
      </Container>
    );
  }

  const discount = product ? discountPercent(product.price, product.compareAtPrice) : 0;

  return (
    <>
      <Container className="pb-16 pt-5 lg:pb-24 lg:pt-8">
        <Breadcrumbs items={crumbs} className="mb-6 lg:mb-8" />

        {!product ? (
          <ProductSkeleton />
        ) : (
          <>
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
              <div className="-mx-4 sm:mx-0 lg:col-span-7">
                <div className="lg:sticky lg:top-24">
                  <ProductGallery key={product.id} images={product.gallery} name={product.name}>
                    <div className="pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-1.5">
                      {!product.inStock && <Badge tone="muted">Sold out</Badge>}
                      {product.inStock && discount > 0 && <Badge tone="sale">−{discount}%</Badge>}
                    </div>
                  </ProductGallery>
                </div>
              </div>

              <div className="lg:col-span-5">
                <ProductPurchase key={product.id} product={product} />
                <div className="mt-10">
                  <ProductAccordion product={product} />
                </div>
              </div>
            </div>

            <div className="mt-20 border-t border-line pt-16 lg:mt-28 lg:pt-24">
              <ProductReviews product={product} />
            </div>
          </>
        )}
      </Container>

      {product && <RelatedProducts product={product} />}
    </>
  );
}
