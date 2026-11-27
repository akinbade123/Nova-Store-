import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sampleCategories, sampleCollections, sampleProducts } from '../src/shared.ts';
import { testApi } from './helpers.ts';

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => (api = await testApi()));
after(() => api.close());

const all = sampleProducts as any[];
const get = async (path: string) => {
  const res = await api.call('GET', path);
  assert.equal(res.status, 200, `${path}: ${JSON.stringify(res.body)}`);
  return res.body;
};
const isSorted = (values: number[], dir: 1 | -1) => values.every((v, i) => i === 0 || (v - values[i - 1]!) * dir >= 0);

describe('GET /products', () => {
  it('returns { items, total, facets } with the Product shape from the spec', async () => {
    const body = await get('/products?limit=100');
    assert.deepEqual(Object.keys(body).sort(), ['facets', 'items', 'total']);
    assert.equal(body.total, all.length);
    const aura = body.items.find((p: any) => p.id === 'p-001');
    const sample = all.find((p) => p.id === 'p-001');
    assert.deepEqual(Object.keys(aura).sort(), [
      'badge', 'category', 'colors', 'compareAtPrice', 'createdAt', 'description', 'id', 'images', 'inStock', 'isBestSeller',
      'isFeatured', 'name', 'price', 'rating', 'reviewCount', 'sizes', 'slug', 'stockCount',
    ]);
    for (const key of ['slug', 'name', 'price', 'compareAtPrice', 'rating', 'reviewCount', 'colors', 'sizes', 'isFeatured', 'createdAt']) {
      assert.deepEqual(aura[key], sample[key], key);
    }
    assert.deepEqual(aura.images, sample.images, 'images keep their order and crops');
  });

  it('defaults to 12 items in "featured" order, and limit is capped', async () => {
    const body = await get('/products');
    assert.equal(body.items.length, 12);
    const firstNonFeatured = body.items.findIndex((p: any) => !p.isFeatured);
    assert.ok(body.items.slice(firstNonFeatured).every((p: any) => !p.isFeatured), 'featured products come first');
    assert.equal((await api.call('GET', '/products?limit=500')).status, 422);
  });

  it('filters by category, with facets that ignore the category filter', async () => {
    const body = await get('/products?categories=electronics,fashion&limit=100');
    const expected = all.filter((p) => ['electronics', 'fashion'].includes(p.category));
    assert.equal(body.total, expected.length);
    assert.ok(body.items.every((p: any) => ['electronics', 'fashion'].includes(p.category)));
    for (const { slug } of sampleCategories as any[]) {
      assert.equal(body.facets.categories[slug], all.filter((p) => p.category === slug).length, `facet ${slug}`);
    }
  });

  it('applies the other filters to the facets', async () => {
    const body = await get('/products?onSale=true&categories=fashion');
    const onSale = all.filter((p) => p.compareAtPrice);
    assert.equal(body.facets.categories.electronics, onSale.filter((p) => p.category === 'electronics').length);
  });

  it('supports q, ids, featured, bestSeller, inStock, onSale, price and rating filters', async () => {
    const cases: [string, (p: any) => boolean][] = [
      ['q=aura', (p) => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes('aura')],
      ['ids=p-001,p-104,p-missing', (p) => ['p-001', 'p-104'].includes(p.id)],
      ['featured=true', (p) => p.isFeatured],
      ['bestSeller=true', (p) => p.isBestSeller],
      ['inStock=true', (p) => p.inStock],
      ['onSale=true', (p) => Boolean(p.compareAtPrice)],
      ['minPrice=50&maxPrice=150', (p) => p.price >= 50 && p.price <= 150],
      ['minRating=4.7', (p) => p.rating >= 4.7],
    ];
    for (const [query, match] of cases) {
      const body = await get(`/products?${query}&limit=100`);
      assert.deepEqual(body.items.map((p: any) => p.id).sort(), all.filter(match).map((p) => p.id).sort(), query);
    }
  });

  it('pages with offset: the pages put together are exactly the full list, in order', async () => {
    for (const sort of ['featured', 'price-asc', 'newest']) {
      const everything = (await get(`/products?sort=${sort}&limit=100`)).items.map((p: any) => p.id);
      const paged: string[] = [];
      for (let offset = 0; offset < everything.length; offset += 7) {
        const page = await get(`/products?sort=${sort}&limit=7&offset=${offset}`);
        assert.equal(page.total, everything.length, 'total is all matches, not the page');
        paged.push(...page.items.map((p: any) => p.id));
      }
      assert.deepEqual(paged, everything, sort);
    }
    assert.deepEqual((await get(`/products?offset=${all.length}`)).items, []);
    assert.equal((await api.call('GET', '/products?offset=-1')).status, 422);
  });

  it('skips the category counts when looking products up by id, and caps ids at 100', async () => {
    const body = await get('/products?ids=p-001,p-104');
    assert.equal(body.items.length, 2);
    assert.deepEqual(body.facets, { categories: {} });
    const tooMany = Array.from({ length: 101 }, (_, i) => `p-${i}`).join(',');
    assert.equal((await api.call('GET', `/products?ids=${tooMany}`)).status, 422);
  });

  it('treats % and _ in search text literally', async () => {
    assert.equal((await get('/products?q=%25')).total, 0);
  });

  it('sorts by every option in the contract', async () => {
    assert.ok(isSorted((await get('/products?sort=price-asc&limit=100')).items.map((p: any) => p.price), 1));
    assert.ok(isSorted((await get('/products?sort=price-desc&limit=100')).items.map((p: any) => p.price), -1));
    assert.ok(isSorted((await get('/products?sort=popular&limit=100')).items.map((p: any) => p.reviewCount), -1));
    assert.ok(isSorted((await get('/products?sort=rating&limit=100')).items.map((p: any) => p.rating), -1));
    const newest = (await get('/products?sort=newest&limit=100')).items.map((p: any) => Date.parse(p.createdAt));
    assert.ok(isSorted(newest, -1));
    const discount = (await get('/products?sort=discount&limit=100')).items.map((p: any) =>
      p.compareAtPrice ? (p.compareAtPrice - p.price) / p.compareAtPrice : 0,
    );
    assert.ok(isSorted(discount, -1));
    const bad = await api.call('GET', '/products?sort=cheapest');
    assert.equal(bad.status, 422);
    assert.equal(bad.body.code, 'validation_failed');
  });
});

describe('product page', () => {
  it('returns a product, and its details with ?include=details', async () => {
    const plain = await get('/products/aura-wireless-headphones');
    assert.equal(plain.gallery, undefined);
    const detail = await get('/products/aura-wireless-headphones?include=details');
    assert.ok(detail.gallery.length >= 2);
    assert.ok(detail.highlights.length > 0);
    assert.ok(Array.isArray(detail.specs[0]) && detail.specs[0].length === 2, 'specs are [label, value] pairs');
    assert.equal(detail.sizeGuide, null);
    assert.equal((await get('/products/prism-court-sneaker?include=details')).sizeGuide, 'shoes');
  });

  it('answers not_found for an unknown slug', async () => {
    const res = await api.call('GET', '/products/no-such-thing');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'not_found');
  });

  it('returns the 8 newest reviews and a 5★-first breakdown that adds up to the review count', async () => {
    const body = await get('/products/p-001/reviews');
    assert.equal(body.items.length, 8);
    assert.ok(isSorted(body.items.map((r: any) => Date.parse(r.date)), -1), 'newest first');
    assert.deepEqual(body.breakdown.map((b: any) => b.stars), [5, 4, 3, 2, 1]);
    const total = body.breakdown.reduce((sum: number, b: any) => sum + b.count, 0);
    assert.ok(Math.abs(total - 1284) <= 2, `breakdown totals ${total}`);
  });

  it('lists related products: same category first, never the product itself', async () => {
    const body = await get('/products/p-001/related?limit=8');
    assert.equal(body.length, 8);
    assert.ok(!body.some((p: any) => p.id === 'p-001'));
    const firstOther = body.findIndex((p: any) => p.category !== 'electronics');
    assert.ok(firstOther === -1 || body.slice(firstOther).every((p: any) => p.category !== 'electronics'));
  });
});

describe('categories, collections, testimonials', () => {
  it('lists categories in display order', async () => {
    const body = await get('/categories');
    assert.deepEqual(body.map((c: any) => c.slug), (sampleCategories as any[]).map((c) => c.slug));
    assert.deepEqual(Object.keys(body[0]).sort(), ['id', 'image', 'name', 'slug', 'tagline']);
  });

  it('returns a collection in its curated order, or sorted on request', async () => {
    const sample = (sampleCollections as any[])[0];
    const body = await get(`/collections/${sample.slug}`);
    assert.deepEqual(body.collection.productIds, sample.productIds);
    assert.deepEqual(body.products.map((p: any) => p.id), sample.productIds);
    assert.equal(body.collection.image, sample.image);
    const sorted = await get(`/collections/${sample.slug}?sort=price-asc`);
    assert.ok(isSorted(sorted.products.map((p: any) => p.price), 1));
    assert.equal((await api.call('GET', '/collections/nope')).status, 404);
  });

  it('returns the featured reviews as homepage testimonials', async () => {
    const body = await get('/reviews/featured');
    assert.equal(body.length, 4);
    assert.deepEqual(Object.keys(body[0]).sort(), ['avatar', 'id', 'location', 'name', 'product', 'quote', 'rating', 'title']);
    assert.equal(body[0].product, 'Aura Wireless Headphones');
  });
});

describe('caching and query cost', () => {
  it('lets a CDN cache public catalogue answers, and browsers revalidate with an ETag', async () => {
    for (const path of ['/products', '/products/moto-leather-jacket', '/categories', '/reviews/featured']) {
      const res = await api.app.request(`/api${path}`);
      assert.equal(res.status, 200, path);
      assert.equal(res.headers.get('cache-control'), 'public, max-age=0, s-maxage=60, stale-while-revalidate=300', path);
      const etag = res.headers.get('etag');
      assert.ok(etag, path);
      const again = await api.app.request(`/api${path}`, { headers: { 'If-None-Match': etag } });
      assert.equal(again.status, 304, `${path} revalidates without resending the body`);
    }
  });

  it('never marks errors or personal answers as cacheable', async () => {
    const missing = await api.app.request('/api/products/no-such-product');
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get('cache-control'), null);
    const { token } = await api.register();
    const mine = await api.app.request('/api/me', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(mine.status, 200);
    assert.ok(!/public|s-maxage/.test(mine.headers.get('cache-control') ?? ''), 'account data is never shared');
  });

  it('skips the category counts when asked', async () => {
    const res = await api.call('GET', '/products?featured=true&limit=4&facets=false');
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 4);
    assert.deepEqual(res.body.facets, { categories: {} });
    assert.equal(typeof res.body.total, 'number');
    const full = await api.call('GET', '/products?featured=true&limit=4');
    assert.ok(Object.keys(full.body.facets.categories).length > 0, 'counts are still the default');
  });
});
