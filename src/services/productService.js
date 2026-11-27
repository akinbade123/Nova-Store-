import { api, mockDelay, nullIfNotFound, USE_MOCK_DATA } from './api';

/** The sample catalogue, loaded only in sample-data mode so API builds never download it. */
const sample = () => import('./mock/catalog.js');

/*
 * Product cache behind the synchronous lookups used by lists kept as ids (cart, wishlist).
 * Sample-data mode: the whole catalogue. API mode: every product the API has returned
 * this session, plus anything requested with loadByIds(). Fresh API responses overwrite
 * older entries, so prices and stock stay current. Subscribe to re-render when it changes.
 */
const cache = new Map();
const unavailable = new Set(); // asked the API for these ids and got nothing back
const inFlight = new Set();
const listeners = new Set();
let cacheVersion = 0;

function notify() {
  cacheVersion += 1;
  listeners.forEach((listener) => listener());
}

function remember(items) {
  const list = (Array.isArray(items) ? items : [items]).filter((item) => item?.id);
  if (!list.length) return;
  list.forEach((item) => {
    cache.set(item.id, item);
    unavailable.delete(item.id);
  });
  notify();
}

/** Sample-data mode: the whole catalogue goes into the cache as soon as it has loaded. */
const sampleReady = USE_MOCK_DATA ? sample().then((mock) => remember(mock.products)) : null;

/*
 * The one contract for GET /products. Every caller goes through fetchProducts, so the
 * backend sees one set of parameter names and always answers { items, total, facets }.
 *
 *   q           search text           categories  comma-separated slugs
 *   ids         comma-separated ids   featured, bestSeller, inStock, onSale  'true' when set
 *   minPrice, maxPrice, minRating     sort (see SORT_OPTIONS)   limit (max 100)   offset (skip that many)
 */
const joinList = (values) => (values?.length ? values.join(',') : undefined);
const flag = (value) => (value ? 'true' : undefined);

async function fetchProducts({ q, category, categories, ids, featured, bestSeller, inStock, onSale, minPrice, maxPrice, minRating, sort, limit, offset, facets = true } = {}) {
  const { data } = await api.get('/products', {
    params: {
      q: q?.trim() || undefined,
      categories: joinList(categories ?? (category ? [category] : undefined)),
      ids: joinList(ids),
      featured: flag(featured),
      bestSeller: flag(bestSeller),
      inStock: flag(inStock),
      onSale: flag(onSale),
      minPrice: minPrice ?? undefined,
      maxPrice: maxPrice ?? undefined,
      minRating: minRating || undefined,
      sort,
      limit,
      offset: offset || undefined,
      // Lists without filters don't need the per-category counts; skipping them saves two queries.
      facets: facets ? undefined : 'false',
    },
  });
  remember(data.items);
  return data;
}

export const productService = {
  /** Plain array of products for rails and suggestions: { category, featured, bestSeller, search, sort, limit }. */
  async list(params = {}) {
    if (USE_MOCK_DATA) return mockDelay((await sample()).list(params));
    const { search, ...rest } = params;
    return (await fetchProducts({ ...rest, q: search, facets: false })).items;
  },

  /** Filtered, sorted and paginated catalogue: { items, total, facets }. */
  async query(params = {}) {
    if (USE_MOCK_DATA) return mockDelay((await sample()).query(params), 450);
    return fetchProducts(params);
  },

  async getBySlug(slug) {
    if (USE_MOCK_DATA) return mockDelay((await sample()).bySlug(slug));
    const { data } = await api.get(`/products/${slug}`);
    remember(data);
    return data;
  },

  /**
   * Full product for the details page: product fields plus gallery, highlights,
   * specs, care and size guide. Resolves to null when the slug does not exist.
   */
  async getDetail(slug) {
    if (!USE_MOCK_DATA) {
      const data = await api
        .get(`/products/${slug}`, { params: { include: 'details' } })
        .then((response) => response.data, nullIfNotFound);
      remember(data);
      return data;
    }
    const product = (await sample()).detail(slug);
    return mockDelay(product, product ? 500 : 400);
  },

  async reviews(product) {
    if (USE_MOCK_DATA) {
      return mockDelay((await sample()).reviews(product), 600);
    }
    const { data } = await api.get(`/products/${product.id}/reviews`);
    return data;
  },

  /** Same-category products first, topped up with popular items from elsewhere. */
  async related(product, limit = 8) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.get(`/products/${product.id}/related`, { params: { limit } });
      remember(data);
      return data;
    }
    return mockDelay((await sample()).related(product, limit), 700);
  },

  /** Quick results for the search panel. Resolves to an array of products. */
  async search(term, limit = 5) {
    const q = term.trim();
    if (!q) return [];
    if (USE_MOCK_DATA) return (await sample()).list({ search: q, limit });
    return (await fetchProducts({ q, limit, facets: false })).items;
  },

  /** Synchronous cache lookup. Returns null until the product has been loaded (see loadByIds). */
  findById(id) {
    return cache.get(id) ?? null;
  },

  /** True once an id is loaded, or the API has confirmed it no longer exists. */
  isResolved(id) {
    return cache.has(id) || unavailable.has(id);
  },

  /**
   * Fetches products that aren't cached yet, in one request: GET /products?ids=a,b,c.
   * Never rejects. Ids the API doesn't return (or can't, on a network error) are marked
   * unavailable, so lists drop them instead of loading forever.
   */
  async loadByIds(ids) {
    const missing = [...new Set(ids)].filter((id) => !cache.has(id) && !unavailable.has(id) && !inFlight.has(id));
    if (!missing.length) return;
    if (USE_MOCK_DATA) {
      // Once the sample catalogue is cached, anything still missing doesn't exist.
      await sampleReady;
      missing.filter((id) => !cache.has(id)).forEach((id) => unavailable.add(id));
      notify();
      return;
    }
    missing.forEach((id) => inFlight.add(id));
    try {
      // The API takes at most 100 ids per request.
      const chunks = [];
      for (let i = 0; i < missing.length; i += 100) chunks.push(missing.slice(i, i + 100));
      await Promise.all(chunks.map((chunk) => fetchProducts({ ids: chunk, limit: chunk.length })));
    } catch {
      /* fall through: treated as unavailable for this session */
    } finally {
      missing.forEach((id) => {
        inFlight.delete(id);
        if (!cache.has(id)) unavailable.add(id);
      });
      notify();
    }
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  cacheVersion() {
    return cacheVersion;
  },

  async categories() {
    if (USE_MOCK_DATA) return mockDelay((await sample()).categories, 300);
    const { data } = await api.get('/categories');
    return data;
  },

  /** A curated collection with its products: { collection, products } or null. */
  async collection(slug, { sort = 'curated' } = {}) {
    if (!USE_MOCK_DATA) {
      const data = await api.get(`/collections/${slug}`, { params: { sort } }).then((response) => response.data, nullIfNotFound);
      remember(data?.products);
      return data;
    }
    const found = (await sample()).collection(slug, sort);
    return mockDelay(found, found ? 500 : 400);
  },

  async testimonials() {
    if (USE_MOCK_DATA) return mockDelay((await sample()).testimonials, 300);
    const { data } = await api.get('/reviews/featured');
    return data;
  },
};
