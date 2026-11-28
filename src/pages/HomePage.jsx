import { Hero } from '../components/home/Hero';
import { FeaturedCategories } from '../components/home/FeaturedCategories';
import { FeaturedProducts } from '../components/home/FeaturedProducts';
import { PromoBanner } from '../components/home/PromoBanner';
import { BestSellers } from '../components/home/BestSellers';
import { ValueProps } from '../components/home/ValueProps';
import { Testimonials } from '../components/home/Testimonials';
import { Newsletter } from '../components/home/Newsletter';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function HomePage() {
  useDocumentTitle();

  // Everything after the hero is off screen on load (render-when-visible in index.css).
  return (
    <div className="[&>section:not(:first-child)]:render-when-visible">
      <Hero />
      <FeaturedCategories />
      <FeaturedProducts />
      <PromoBanner />
      <BestSellers />
      <ValueProps />
      <Testimonials />
      <Newsletter />
    </div>
  );
}
