import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { ErrorState } from '../ui/ErrorState';
import { ProductCarousel } from '../product/ProductCarousel';
import { productService } from '../../services/productService';
import { useAsync } from '../../hooks/useAsync';

export function BestSellers() {
  const { data, loading, error, retry } = useAsync(() => productService.list({ bestSeller: true, sort: 'popular' }));

  return (
    <section aria-labelledby="bestsellers-heading" className="overflow-hidden pb-16 lg:pb-24">
      <Container>
        {error ? (
          <>
            <SectionHeader id="bestsellers-heading" eyebrow="Most wanted" title="Best sellers" />
            <ErrorState message={error.userMessage ?? 'We couldn’t load best sellers.'} onRetry={retry} />
          </>
        ) : (
          <ProductCarousel
            products={data ?? []}
            loading={loading}
            label="Best sellers"
            renderHeader={(controls) => (
              <SectionHeader
                id="bestsellers-heading"
                eyebrow="Most wanted"
                title="Best sellers"
                description="The pieces our customers come back for, again and again."
                actions={<div className="hidden sm:block">{controls}</div>}
              />
            )}
          />
        )}
      </Container>
    </section>
  );
}
