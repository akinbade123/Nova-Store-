/** docs/API.md, section 7: the catalogue. All public. */
import { Hono } from 'hono';
import { etag } from 'hono/etag';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.ts';
import { categories, collectionProducts, collections, productImages, products, reviews } from '../../db/schema.ts';
import { notFound } from '../../lib/errors.ts';
import { readQuery } from '../../lib/validate.ts';
import type { AppEnv, Deps } from '../../types.ts';
import { ORDER_BY, SORTS, productQuery, queryProducts, toImage, toProduct, withImages } from './products.ts';

const REVIEWS_SHOWN = 8;
const FEATURED_REVIEWS_MAX = 12; // the homepage shows a handful; marking more as featured mustn't slow it down

const findProduct = async (db: Db, column: 'slug' | 'id', value: string) => {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products[column], value), eq(products.published, true)))
    .limit(1);
  if (!row) throw notFound('We can’t find that product.');
  return row;
};

/**
 * Everything here is public and the same for every shopper, so a CDN in front of the API may keep a
 * copy for a minute and serve it while it fetches a fresh one in the background. Browsers always
 * check back (max-age=0), and the ETag lets them do that with a 304 instead of the whole response.
 * Changes to products show up within about a minute. Errors and 404s are never cached.
 */
export const CATALOG_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

export function catalogRoutes({ db }: Deps) {
  const app = new Hono<AppEnv>();

  app.use('*', etag(), async (c, next) => {
    await next();
    if (c.req.method === 'GET' && c.res.status === 200) c.header('Cache-Control', CATALOG_CACHE);
  });

  app.get('/products', async (c) => c.json(await queryProducts(db, readQuery(c, productQuery))));

  // GET /products/:slug, with ?include=details for the product page.
  app.get('/products/:slug', async (c) => {
    const row = await findProduct(db, 'slug', c.req.param('slug'));
    const images = await db.select().from(productImages).where(eq(productImages.productId, row.id)).orderBy(asc(productImages.position));
    const product = toProduct(row, images.filter((image) => image.kind === 'card'));
    if (c.req.query('include') !== 'details') return c.json(product);
    return c.json({
      ...product,
      gallery: images.filter((image) => image.kind === 'gallery').map(toImage),
      highlights: row.highlights,
      specs: row.specs,
      care: row.care,
      sizeGuide: row.sizeGuide,
    });
  });

  app.get('/products/:id/reviews', async (c) => {
    const product = await findProduct(db, 'id', c.req.param('id'));
    const rows = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, product.id), eq(reviews.status, 'approved')))
      .orderBy(desc(reviews.createdAt), asc(reviews.id))
      .limit(REVIEWS_SHOWN);
    return c.json({
      items: rows.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        name: review.displayName,
        location: review.location,
        date: review.createdAt.toISOString().slice(0, 10),
        verified: review.verified || review.orderItemId != null,
        helpful: review.helpfulCount,
        variant: review.variant,
      })),
      // rating_counts is stored 1★…5★; the storefront lists 5★ first.
      breakdown: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: product.ratingCounts[stars - 1] ?? 0 })),
    });
  });

  // Same-category products first (most popular first), then popular products from elsewhere.
  app.get('/products/:id/related', async (c) => {
    const { limit } = readQuery(c, z.object({ limit: z.coerce.number().int().min(1).max(24).default(8) }));
    const product = await findProduct(db, 'id', c.req.param('id'));
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.published, true), ne(products.id, product.id)))
      .orderBy(desc(sql`${products.categoryId} = ${product.categoryId}`), desc(products.reviewCount), asc(products.id))
      .limit(limit);
    return c.json(await withImages(db, rows));
  });

  app.get('/categories', async (c) => {
    const rows = await db.select().from(categories).orderBy(asc(categories.position));
    return c.json(rows.map(({ id, slug, name, tagline, imageUrl }) => ({ id, slug, name, tagline, image: imageUrl })));
  });

  app.get('/collections/:slug', async (c) => {
    const { sort } = readQuery(c, z.object({ sort: z.enum(['curated', ...SORTS]).default('curated') }));
    const [collection] = await db
      .select()
      .from(collections)
      .where(and(eq(collections.slug, c.req.param('slug')), eq(collections.published, true)));
    if (!collection) throw notFound('That collection has ended.');
    const members = await db
      .select({ productId: collectionProducts.productId })
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionSlug, collection.slug))
      .orderBy(asc(collectionProducts.position));
    const productIds = members.map((member) => member.productId);
    let rows = productIds.length
      ? await db
          .select()
          .from(products)
          .where(and(inArray(products.id, productIds), eq(products.published, true)))
          .orderBy(...(sort === 'curated' ? [asc(products.id)] : ORDER_BY[sort]))
      : [];
    if (sort === 'curated') rows = rows.sort((a, b) => productIds.indexOf(a.id) - productIds.indexOf(b.id));
    const { imageUrl, position: _position, published: _published, ...rest } = collection;
    return c.json({ collection: { ...rest, image: imageUrl, productIds }, products: await withImages(db, rows) });
  });

  // The homepage testimonials: approved reviews marked as featured.
  app.get('/reviews/featured', async (c) => {
    const rows = await db
      .select({ review: reviews, productName: products.name })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .where(and(eq(reviews.isFeatured, true), eq(reviews.status, 'approved')))
      .orderBy(asc(reviews.id))
      .limit(FEATURED_REVIEWS_MAX);
    return c.json(
      rows.map(({ review, productName }) => ({
        id: review.id,
        name: review.displayName,
        location: review.location,
        avatar: review.avatarUrl,
        rating: review.rating,
        product: productName,
        title: review.title,
        quote: review.body,
      })),
    );
  });

  return app;
}
