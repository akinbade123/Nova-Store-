import { IS_DEMO_SITE } from '../../data/site';

/** Shown on every page of a demo deploy, so nobody mistakes sample-data orders for real ones. */
export function DemoBanner() {
  if (!IS_DEMO_SITE) return null;
  return (
    <div role="note" className="bg-accent-soft px-4 py-2 text-center text-caption leading-snug text-ink">
      <strong className="font-semibold">Demo store.</strong> Orders, payments and accounts aren’t real and stay in this browser.
    </div>
  );
}
