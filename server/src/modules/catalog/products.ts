/** Product queries and how products are shaped for the API (docs/API.md, "Product" and GET /products). */
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNotNull, lte, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.ts';
import { categories, productImages, products } from '../../db/schema.ts';
import { toCents, toDollars } from '../../lib/money.ts';

type ProductRow = typeof products.$inferSelect;
type ImageRow = typeof productImages.$inferSelect;

export const SORTS = ['featured', 'popular', 'newest', 'price-asc', 'price-desc', 'rating', 'discount'] as const;
export type Sort = (typeof SORTS)[number];

const discountRatio = sql`COALESCE((${products.compareAtCents} - ${products.priceCents})::float / NULLIF(${products.compareAtCents}, 0), 0)`;

/** Same orderings as the sample-data sorters in the storefront. The id breaks ties, so pages are stable. */
export const ORDER_BY: Record<Sort, SQL[]> = {
  featured: [desc(products.isFeatured), desc(products.reviewCount), asc(products.id)],
  popular: [desc(products.reviewCount), asc(products.id)],
  newest: [desc(products.createdAt), asc(products.id)],
  'price-asc': [asc(products.priceCents), asc(products.id)],
  'price-desc': [desc(products.priceCents), asc(products.id)],
  rating: [desc(products.ratingAvg), desc(products.reviewCount), asc(products.id)],
  discount: [desc(discountRatio), desc(products.reviewCount), asc(products.id)],
};

const csv = z
  .string()
  .optional()
  .transform((value) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []));
const flag = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');
const amount = z.coerce.number().min(0).optional();

/** Query parameters for GET /products. Unknown parameters are ignored. */
export const productQuery = z.object({
  q: z.string().trim().max(100).optional(),
  categories: csv,
  ids: csv.refine((ids) => ids.length <= 100, 'Ask for at most 100 ids at a time'),
  featured: flag,
  bestSeller: flag,
  inStock: flag,
  onSale: flag,
  minPrice: amount,
  maxPrice: amount,
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(SORTS, { error: `sort must be one of: ${SORTS.join(', ')}` }).default('featured'),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  /** How many matches to skip: "Load more" asks for the next page instead of everything again. */
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});
export type ProductQuery = z.infer<typeof productQuery>;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** WHERE conditions for a query. `withCategories: false` gives the facet base: every filter except categories. */
function conditions(query: ProductQuery, { withCategories = true } = {}) {
  const where: (SQL | undefined)[] = [eq(products.published, true)];
  if (query.q) {
    where.push(ilike(sql`${products.name} || ' ' || ${products.categoryId} || ' ' || ${products.description}`, `%${escapeLike(query.q)}%`));
  }
  if (query.ids.length) where.push(inArray(products.id, query.ids));
  if (query.featured) where.push(eq(products.isFeatured, true));
  if (query.bestSeller) where.push(eq(products.isBestSeller, true));
  if (query.inStock) where.push(gt(products.stockCount, 0));
  if (query.onSale) where.push(isNotNull(products.compareAtCents)); // a check constraint keeps it above the price
  if (query.minPrice != null) where.push(gte(products.priceCents, toCents(query.minPrice)));
  if (query.maxPrice != null) where.push(lte(products.priceCents, toCents(query.maxPrice)));
  if (query.minRating) where.push(gte(products.ratingAvg, query.minRating));
  if (withCategories && query.categories.length) where.push(inArray(products.categoryId, query.categories));
  return and(...where);
}

/** GET /products: `{ items, total, facets }`. */
export async function queryProducts(db: Db, query: ProductQuery) {
  const where = conditions(query);
  // Looking products up by id (the cart, the wishlist) needs no category counts, so skip those queries.
  const wantsFacets = query.ids.length === 0;
  const [rows, [{ total } = { total: 0 }], facetRows, categoryRows] = await Promise.all([
    db.select().from(products).where(where).orderBy(...ORDER_BY[query.sort]).limit(query.limit).offset(query.offset),
    db.select({ total: count() }).from(products).where(where),
    wantsFacets
      ? db
          .select({ category: products.categoryId, n: count() })
          .from(products)
          .where(conditions(query, { withCategories: false }))
          .groupBy(products.categoryId)
      : [],
    wantsFacets ? db.select({ slug: categories.slug }).from(categories).orderBy(asc(categories.position)) : [],
  ]);
  const counts = Object.fromEntries(facetRows.map((row) => [row.category, row.n]));
  return {
    items: await withImages(db, rows),
    total,
    facets: { categories: Object.fromEntries(categoryRows.map(({ slug }) => [slug, counts[slug] ?? 0])) },
  };
}

/** Loads card images for a list of product rows in one query and returns API products, in the same order. */
export async function withImages(db: Db, rows: ProductRow[]) {
  if (!rows.length) return [];
  const images = await db
    .select()
    .from(productImages)
    .where(and(inArray(productImages.productId, rows.map((row) => row.id)), eq(productImages.kind, 'card')))
    .orderBy(asc(productImages.position));
  const byProduct = Map.groupBy(images, (image) => image.productId);
  return rows.map((row) => toProduct(row, byProduct.get(row.id) ?? []));
}

export const toImage = (image: ImageRow) => ({
  src: image.url,
  ...(image.zoom != null && { zoom: image.zoom }),
  ...(image.focalX != null && { x: image.focalX }),
  ...(image.focalY != null && { y: image.focalY }),
});

/** docs/API.md, "Product". */
export const toProduct = (row: ProductRow, images: ImageRow[]) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  category: row.categoryId,
  description: row.description,
  price: toDollars(row.priceCents),
  compareAtPrice: row.compareAtCents == null ? null : toDollars(row.compareAtCents),
  badge: row.badge,
  rating: row.ratingAvg,
  reviewCount: row.reviewCount,
  images: images.map(toImage),
  colors: row.colors,
  sizes: row.sizes,
  inStock: row.stockCount > 0,
  stockCount: row.stockCount,
  isFeatured: row.isFeatured,
  isBestSeller: row.isBestSeller,
  createdAt: row.createdAt.toISOString().slice(0, 10),
});
