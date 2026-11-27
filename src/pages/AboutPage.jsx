import { ArrowUpRight, Leaf, PackageCheck, Recycle, Sparkles, Truck, Users } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { SmartImage } from '../components/ui/SmartImage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { contactEmail } from '../data/site';

const values = [
  { Icon: Sparkles, title: 'Fewer, better things', text: 'We test hundreds of products to stock a few dozen. If we wouldn’t use it every day, we don’t sell it.' },
  { Icon: PackageCheck, title: 'Built to last', text: 'Every product carries a warranty, and we publish repair guides so the things you buy stay in use.' },
  { Icon: Users, title: 'People first', text: 'Real humans answer every message, and the people who make our products are paid fairly.' },
  { Icon: Leaf, title: 'Lighter footprint', text: 'Plastic-free packaging, carbon-neutral shipping and a growing range of recycled materials.' },
];

const stats = [
  { value: '120k+', label: 'Customers worldwide' },
  { value: '4.9/5', label: 'Average review rating' },
  { value: '30+', label: 'Countries we ship to' },
  { value: '2019', label: 'Founded in Lagos' },
];

const commitments = [
  { Icon: Recycle, title: '100% plastic-free packaging', text: 'Recycled card, paper tape and plant-based inks since 2022.' },
  { Icon: Truck, title: 'Carbon-neutral delivery', text: 'Every shipment’s emissions are measured and offset through verified projects.' },
  { Icon: Leaf, title: '60% recycled or organic materials', text: 'Across our apparel range today — our goal is 85% by 2028.' },
];

const roles = [
  { title: 'Senior Frontend Engineer', team: 'Engineering', location: 'Lagos or remote' },
  { title: 'Product Designer, Checkout', team: 'Design', location: 'London or remote' },
  { title: 'Customer Experience Lead', team: 'Support', location: 'Lagos' },
  { title: 'Merchandise Buyer, Home', team: 'Merchandising', location: 'Copenhagen' },
];

export default function AboutPage() {
  useDocumentTitle('About NOVA');

  return (
    <>
      <Container className="pt-6 lg:pt-10">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About' }]} />
        <header className="mx-auto max-w-4xl py-14 text-center lg:py-20">
          <p className="eyebrow text-muted">About NOVA</p>
          <h1 className="mt-5 text-[40px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
            We make it easier to buy less, but better.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            NOVA started with a simple frustration: too many choices, too few good ones. So we built a store where every product
            has earned its place.
          </p>
        </header>
      </Container>

      <Container className="px-3 sm:px-6 lg:px-10">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-surface sm:aspect-[16/8] lg:rounded-[32px]">
          <SmartImage
            src="1512436991641-6745cdb1723f"
            alt="A rail of neutral-toned shirts, knitwear and jackets in the NOVA studio"
            sizes="(min-width: 1440px) 1400px, 100vw"
            widths={[640, 960, 1280, 1600, 2000]}
          />
        </div>
      </Container>

      {/* Story */}
      <Container className="py-20 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <h2 className="text-heading font-semibold leading-[1.1] tracking-tight sm:text-4xl">From a two-person studio to a store for 120,000 people.</h2>
          <div className="space-y-5 text-body leading-relaxed text-ink/75">
            <p>
              We opened in 2019 as a small studio in Lagos, selling a handful of headphones and bags we’d tested for months. Customers
              kept asking what else we’d recommend — so we kept testing, and kept saying no to most of it.
            </p>
            <p>
              Today our buyers in Lagos, London and Copenhagen review every product for build quality, repairability and how it feels
              after a year of daily use. What makes the cut is what you see here: electronics, clothing, accessories and homeware
              chosen to be lived with, not replaced.
            </p>
            <p>
              We’re still small enough that the founders read customer reviews every week. If something isn’t right, tell us — it
              genuinely changes what we stock.
            </p>
          </div>
        </div>
      </Container>

      {/* Stats */}
      <section aria-label="NOVA in numbers" className="border-y border-line bg-surface/60">
        <Container className="py-14 lg:py-16">
          <dl className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse text-center">
                <dt className="mt-2 text-sm text-muted">{stat.label}</dt>
                <dd className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Values */}
      <Container className="py-20 lg:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted">What we believe</p>
          <h2 className="mt-3 text-heading font-semibold leading-[1.1] tracking-tight sm:text-4xl">Four promises behind every product.</h2>
        </div>
        <ul className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ Icon, title, text }) => (
            <li key={title}>
              <span className="flex size-12 items-center justify-center rounded-full bg-surface">
                <Icon className="size-[22px]" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-sans text-base font-semibold tracking-normal">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </Container>

      {/* Sustainability */}
      <section id="sustainability" aria-labelledby="sustainability-heading" className="scroll-mt-24">
        <Container className="px-3 sm:px-6 lg:px-10">
          <div className="grid overflow-hidden rounded-[24px] bg-ink text-white lg:grid-cols-2 lg:rounded-[32px]">
            <div className="relative min-h-[300px] lg:min-h-[560px]">
              <SmartImage src="1556905055-8f358a7a47b2" alt="Folded knitwear, denim and a watch laid out on linen" sizes="(min-width: 1024px) 50vw, 100vw" />
            </div>
            <div className="p-8 sm:p-12 lg:p-16">
              <p className="eyebrow text-white/60">Sustainability</p>
              <h2 id="sustainability-heading" className="mt-4 text-heading font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl">
                Progress we can measure.
              </h2>
              <p className="mt-4 max-w-md text-body leading-relaxed text-white/70">
                We publish our numbers every year — including the ones we haven’t hit yet.
              </p>
              <ul className="mt-10 space-y-7">
                {commitments.map(({ Icon, title, text }) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-sans text-body font-semibold tracking-normal text-white">{title}</h3>
                      <p className="mt-1 text-sm text-white/65">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Careers */}
      <section id="careers" aria-labelledby="careers-heading" className="scroll-mt-24">
        <Container className="py-20 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <div>
              <p className="eyebrow text-muted">Careers</p>
              <h2 id="careers-heading" className="mt-3 text-heading font-semibold leading-[1.1] tracking-tight sm:text-4xl">
                Help us build a better kind of store.
              </h2>
              <p className="mt-4 max-w-md text-body leading-relaxed text-muted">
                We’re a team of 64 across three cities. Flexible hours, a generous product allowance and real ownership of your work.
              </p>
            </div>
            <ul className="divide-y divide-line border-y border-line">
              {roles.map((role) => (
                <li key={role.title}>
                  <a
                    href={`mailto:${contactEmail.careers}?subject=${encodeURIComponent(`Application: ${role.title}`)}`}
                    className="group flex items-center justify-between gap-4 py-5"
                  >
                    <span>
                      <span className="block text-body font-semibold underline-offset-4 group-hover:underline">{role.title}</span>
                      <span className="mt-1 block text-sm text-muted">
                        {role.team} · {role.location}
                      </span>
                    </span>
                    <ArrowUpRight className="size-5 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <Container className="pb-20 lg:pb-28">
        <div className="flex flex-col items-center rounded-[24px] bg-surface-warm px-6 py-14 text-center lg:rounded-[32px] lg:py-20">
          <h2 className="max-w-xl text-heading font-bold leading-[1.1] tracking-tight sm:text-[44px]">Find something worth keeping.</h2>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/shop" size="lg">
              Shop the collection
            </Button>
            <Button to="/help#contact" size="lg" variant="secondary" className="bg-white/70">
              Talk to us
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
}
