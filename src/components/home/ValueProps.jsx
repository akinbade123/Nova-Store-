import { Headset, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { Container } from '../ui/Container';

const values = [
  {
    Icon: Truck,
    title: 'Free & reliable shipping',
    text: 'Free express delivery on orders over $100, tracked from our door to yours.',
  },
  {
    Icon: ShieldCheck,
    title: 'Secure payments',
    text: 'Encrypted checkout with every major card, PayPal, Apple Pay and Google Pay.',
  },
  {
    Icon: RotateCcw,
    title: 'Easy 30-day returns',
    text: 'Changed your mind? Send it back free within 30 days — no questions asked.',
  },
  {
    Icon: Headset,
    title: 'Real human support',
    text: 'Talk to our team six days a week by chat, email or phone.',
  },
];

export function ValueProps() {
  return (
    <section aria-labelledby="values-heading" className="border-y border-line bg-surface/50">
      <Container className="py-14 lg:py-20">
        <div className="mb-10 max-w-xl lg:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">The NOVA promise</p>
          <h2 id="values-heading" className="text-[28px] font-semibold leading-[1.1] sm:text-4xl">
            Why shop with us
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-4 lg:flex-col lg:gap-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-line">
                <Icon className="size-[22px]" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-sans text-[15px] font-semibold tracking-normal">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
