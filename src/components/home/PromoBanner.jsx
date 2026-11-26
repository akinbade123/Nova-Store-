import { ArrowRight } from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { SmartImage } from '../ui/SmartImage';

export function PromoBanner() {
  return (
    <section aria-labelledby="promo-heading" className="pb-16 lg:pb-24">
      <Container className="px-3 sm:px-6 lg:px-10">
        <div className="relative isolate flex min-h-[560px] items-end overflow-hidden rounded-[24px] bg-ink sm:min-h-[520px] lg:min-h-[600px] lg:items-center lg:rounded-[32px]">
          <SmartImage
            src="1445205170230-053b83016050"
            alt="Warm-toned knitwear and coats on a boutique rail"
            sizes="(min-width: 1440px) 1400px, 100vw"
            widths={[640, 960, 1280, 1600, 2000]}
            imgClassName="object-[60%_center]"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/5 lg:bg-gradient-to-r lg:from-black/75 lg:via-black/35 lg:to-transparent"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-xl px-6 pb-8 sm:px-10 sm:pb-12 lg:px-16 lg:pb-0 xl:px-20">
            <p className="eyebrow text-white/75">The Autumn Edit</p>
            <h2 id="promo-heading" className="mt-4 text-title font-bold leading-[1.05] text-white sm:text-5xl lg:text-[56px]">
              Layers worth
              <br />
              living in.
            </h2>
            <p className="mt-5 max-w-md text-body leading-relaxed text-white/80 sm:text-base">
              Up to 30% off knitwear, outerwear and everyday essentials — cut from softer fabrics for the colder months.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/collections/autumn-edit" variant="inverse" size="lg" className="group">
                Shop Collection
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Button>
              <Button to="/shop?category=fashion" variant="outline-inverse" size="lg">
                Shop all fashion
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
