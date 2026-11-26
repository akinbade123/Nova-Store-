import { cn } from '../../utils/cn';

const tones = {
  dark: 'bg-ink text-white',
  light: 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]',
  sale: 'bg-sale text-white',
  accent: 'bg-accent text-white',
  muted: 'bg-white/90 text-muted',
};

export function Badge({ tone = 'light', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-2xs font-semibold uppercase leading-none tracking-[0.06em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
