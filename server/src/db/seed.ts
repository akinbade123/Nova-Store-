/**
 * Loads the storefront's sample data (src/data/*) into the database, so local and staging data match
 * what the UI expects (docs/DATA_MODEL.md, section 9). Safe to run repeatedly: existing rows are kept.
 *
 *   npm run db:seed              catalogue, shipping methods and promotions
 *   npm run db:seed -- --demo    plus the demo account (never in production)
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from './client.ts';
import {
  categories,
  collectionProducts,
  collections,
  productImages,
  products,
  promotions,
  reviews,
  shippingMethods,
  users,
} from './schema.ts';
import { hashPassword } from '../lib/crypto.ts';
import { toCents } from '../lib/money.ts';
import {
  getProductDetails,
  getSampleReviews,
  ratingBreakdown,
  sampleCategories,
  sampleCollections,
  sampleProducts,
  sampleShippingMethods,
  sampleTestimonials,
} from '../shared.ts';

/**
 * Copied from src/services/cartService.js, which can't be imported here (it loads the browser's axios client).
 * Keep them in step until the storefront reads promotions only from the API.
 */
const PROMOTIONS = [
  { code: 'NOVA10', type: 'percent', value: 10, label: '10% off your order', minSubtotal: 0 },
  { code: 'WELCOME15', type: 'percent', value: 15, label: '15% off orders over $150', minSubtotal: 150 },
  { code: 'FREESHIP', type: 'shipping', value: 0, label: 'Free shipping', minSubtotal: 0 },
] as const;

/** Same as DEMO_ACCOUNT in src/services/authService.js. */
export const DEMO_ACCOUNT = { id: 'u-demo', email: 'demo@example.com', password: 'Nova2026!', firstName: 'Ada', lastName: 'Okafor' };

// The sample catalogue's default gallery when a product doesn't set its own crops (src/services/productService.js).
const DEFAULT_CROPS = [
  { zoom: 1.6, x: 0.5, y: 0.5 },
  { zoom: 2.2, x: 0.5, y: 0.42 },
  { zoom: 2.2, x: 0.5, y: 0.62 },
];

type SampleImage = { src: string; zoom?: number; x?: number; y?: number };

export async function seed(db: Db, { demoAccount = false } = {}) {
  await db.transaction(async (tx) => {
    await tx
      .insert(categories)
      .values(sampleCategories.map((c: any, position: number) => ({ id: c.id, slug: c.slug, name: c.name, tagline: c.tagline, imageUrl: c.image, position })))
      .onConflictDoNothing();

    for (const p of sampleProducts as any[]) {
      const details = getProductDetails(p);
      // ratingBreakdown lists 5★ first; the database stores [1★ … 5★].
      const counts = ratingBreakdown(p.rating, p.reviewCount).map((row: { count: number }) => row.count).reverse();
      const [inserted] = await tx
        .insert(products)
        .values({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          categoryId: p.category,
          priceCents: toCents(p.price),
          compareAtCents: p.compareAtPrice ? toCents(p.compareAtPrice) : null,
          badge: p.badge,
          stockCount: p.inStock ? p.stockCount : 0,
          colors: p.colors,
          sizes: p.sizes,
          isFeatured: p.isFeatured,
          isBestSeller: p.isBestSeller,
          ratingAvg: p.rating,
          reviewCount: p.reviewCount,
          ratingCounts: counts,
          highlights: details.highlights ?? [],
          specs: details.specs ?? [],
          care: details.care ?? null,
          sizeGuide: details.sizeGuide ?? null,
          createdAt: new Date(p.createdAt),
        })
        .onConflictDoNothing()
        .returning({ id: products.id });
      if (!inserted) continue; // already seeded: leave its images and reviews alone

      // Image `src` values are Unsplash photo IDs; the storefront's imageUrl() expands them and also accepts full URLs.
      const image = (kind: 'card' | 'gallery') => (img: SampleImage, position: number) => ({
        id: `${p.id}-${kind}-${position}`,
        productId: p.id,
        kind,
        url: img.src,
        position,
        zoom: img.zoom ?? null,
        focalX: img.x ?? null,
        focalY: img.y ?? null,
      });
      const src = p.images[0].src;
      const gallery: SampleImage[] = [{ src }, ...(details.crops ?? DEFAULT_CROPS).map((crop: object) => ({ src, ...crop }))];
      await tx.insert(productImages).values([...p.images.map(image('card')), ...gallery.map(image('gallery'))]);

      await tx.insert(reviews).values(
        getSampleReviews(p).map((r: any) => ({
          id: r.id,
          productId: p.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          displayName: r.name,
          location: r.location,
          variant: r.variant,
          verified: r.verified,
          helpfulCount: r.helpful,
          status: 'approved' as const,
          createdAt: new Date(`${r.date}T12:00:00Z`),
        })),
      );
    }

    for (const [position, c] of (sampleCollections as any[]).entries()) {
      const [inserted] = await tx
        .insert(collections)
        .values({ slug: c.slug, name: c.name, eyebrow: c.eyebrow, tagline: c.tagline, description: c.description, imageUrl: c.image, tone: c.tone, position })
        .onConflictDoNothing()
        .returning({ slug: collections.slug });
      if (inserted) {
        await tx.insert(collectionProducts).values(c.productIds.map((productId: string, i: number) => ({ collectionSlug: c.slug, productId, position: i })));
      }
    }

    // Homepage testimonials become featured reviews.
    await tx
      .insert(reviews)
      .values(
        (sampleTestimonials as any[]).map((t) => ({
          id: t.id,
          productId: (sampleProducts as any[]).find((p) => p.name === t.product).id,
          rating: t.rating,
          title: t.title,
          body: t.quote,
          displayName: t.name,
          location: t.location,
          avatarUrl: t.avatar,
          verified: true,
          status: 'approved' as const,
          isFeatured: true,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(shippingMethods)
      .values(
        (sampleShippingMethods as any[]).map((m, position) => ({
          id: m.id,
          label: m.label,
          eta: m.eta,
          priceCents: toCents(m.price),
          freeOverCents: m.freeOver == null ? null : toCents(m.freeOver),
          minDays: m.minDays,
          maxDays: m.maxDays,
          position,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(promotions)
      .values(PROMOTIONS.map(({ minSubtotal, ...promo }) => ({ ...promo, minSubtotalCents: toCents(minSubtotal) })))
      .onConflictDoNothing();

    if (demoAccount) {
      await tx
        .insert(users)
        .values({
          id: DEMO_ACCOUNT.id,
          email: DEMO_ACCOUNT.email,
          passwordHash: await hashPassword(DEMO_ACCOUNT.password),
          firstName: DEMO_ACCOUNT.firstName,
          lastName: DEMO_ACCOUNT.lastName,
          marketing: true,
          emailVerifiedAt: new Date(),
          createdAt: new Date('2025-03-14T10:00:00.000Z'),
        })
        .onConflictDoNothing();
    }
  });
}

// `npm run db:seed`
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { createDb } = await import('./client.ts');
  const { env } = await import('../env.ts');
  const demoAccount = process.argv.includes('--demo');
  // The demo account's password is public (it's in the README), so it must never reach a real database.
  // Refused in production, and for any database not on this machine unless explicitly allowed (e.g. staging).
  const remote = env.databaseUrl && !['localhost', '127.0.0.1', '::1', '[::1]'].includes(new URL(env.databaseUrl).hostname);
  if (demoAccount && (env.isProduction || (remote && process.env.ALLOW_DEMO_ACCOUNT !== 'true'))) {
    console.error(
      env.isProduction
        ? 'Refusing to create the demo account in production: its password is public.'
        : 'Refusing to create the demo account on a database that isn’t on this machine: its password is public. Set ALLOW_DEMO_ACCOUNT=true if this really is a test database.',
    );
    process.exit(1);
  }
  const database = await createDb({ url: env.databaseUrl, migrationUrl: env.databaseMigrationUrl, dataDir: env.databaseUrl ? undefined : env.pgliteDir, pool: { max: env.dbPoolMax, statementTimeoutMs: env.dbStatementTimeoutMs } });
  await database.migrate();
  await seed(database.db, { demoAccount });
  await database.close();
  console.log(`Seeded the sample catalogue${demoAccount ? ' and the demo account' : ''}.`);
}
