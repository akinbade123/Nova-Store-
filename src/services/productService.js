import { api, mockDelay, nullIfNotFound, USE_MOCK_DATA } from './api';
import { products } from '../data/products';
import { categories } from '../data/categories';
import { testimonials } from '../data/testimonials';
import { findCollection } from '../data/collections';
import { getProductDetails, getSampleReviews, ratingBreakdown } from '../data/productDetails';

/*
 * Product cache behind the synchronous lookups used by lists kept as ids (cart, wishlist).
 * Sample-data mode: the whole catalogue. API mode: every product the API has returned
 * this session, plus anything requested with loadByIds(). Fresh API responses overwrite
 * older entries, so prices and stock stay current. Subscribe to re-render when it changes.
 */
const cache = new Map(USE_MOCK_DATA ? products.map((item) => [item.id, item]) : []);
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

/*
 * The one contract for GET /products. Every caller goes through fetchProducts, so the
 * backend sees one set of parameter names and always answers { items, total, facets }.
 *
 *   q           search text           categories  comma-separated slugs
 *   ids         comma-separated ids   featured, bestSeller, inStock, onSale  'true' when set
 *   minPrice, maxPrice, minRating     sort (see SORT_OPTIONS)   limit
 */
const joinList = (values) => (values?.length ? values.join(',') : undefined);
const flag = (value) => (value ? 'true' : undefined);

async function fetchProducts({ q, category, categories, ids, featured, bestSeller, inStock, onSale, minPrice, maxPrice, minRating, sort, limit } = {}) {
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
    },
  });
  remember(data.items);
  return data;
}

const discountRatio = (item) => (item.compareAtPrice ? (item.compareAtPrice - item.price) / item.compareAtPrice : 0);

const sorters = {
  featured: (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.reviewCount - a.reviewCount,
  popular: (a, b) => b.reviewCount - a.reviewCount,
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  discount: (a, b) => discountRatio(b) - discountRatio(a) || b.reviewCount - a.reviewCount,
};

const matchesSearch = (item, term) =>
  `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(term.trim().toLowerCase());

/** Simple list used by homepage rails. */
function listMock({ category, featured, bestSeller, search, sort, limit } = {}) {
  let result = [...products];
  if (category) result = result.filter((item) => item.category === category);
  if (featured) result = result.filter((item) => item.isFeatured);
  if (bestSeller) result = result.filter((item) => item.isBestSeller);
  if (search) result = result.filter((item) => matchesSearch(item, search));
  if (sort && sorters[sort]) result.sort(sorters[sort]);
  if (limit) result = result.slice(0, limit);
  return result;
}

/**
 * Catalogue query for the Shop page. Mirrors the expected
 * GET /products response: { items, total, facets }.
 * Category facet counts ignore the category filter itself, so each option
 * shows how many results selecting it would add.
 */
function catalogueMock({
  q,
  categories: selected = [],
  minPrice,
  maxPrice,
  minRating,
  inStock,
  onSale,
  sort = 'featured',
  limit = 12,
}) {
  const passesOtherFilters = (item) =>
    (!q || matchesSearch(item, q)) &&
    (minPrice == null || item.price >= minPrice) &&
    (maxPrice == null || item.price <= maxPrice) &&
    (!minRating || item.rating >= minRating) &&
    (!inStock || item.inStock) &&
    (!onSale || discountRatio(item) > 0);

  const base = products.filter(passesOtherFilters);
  const facets = {
    categories: Object.fromEntries(
      categories.map((category) => [category.slug, base.filter((item) => item.category === category.slug).length]),
    ),
  };
  const matched = (selected.length ? base.filter((item) => selected.includes(item.category)) : base).sort(
    sorters[sort] ?? sorters.featured,
  );

  return { items: matched.slice(0, limit), total: matched.length, facets };
}

export const productService = {
  /** Plain array of products for rails and suggestions: { category, featured, bestSeller, search, sort, limit }. */
  async list(params = {}) {
    if (USE_MOCK_DATA) return mockDelay(listMock(params));
    const { search, ...rest } = params;
    return (await fetchProducts({ ...rest, q: search })).items;
  },

  /** Filtered, sorted and paginated catalogue: { items, total, facets }. */
  async query(params = {}) {
    if (USE_MOCK_DATA) return mockDelay(catalogueMock(params), 450);
    return fetchProducts(params);
  },

  async getBySlug(slug) {
    if (USE_MOCK_DATA) return mockDelay(products.find((item) => item.slug === slug) ?? null);
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
    const product = products.find((item) => item.slug === slug);
    if (!product) return mockDelay(null, 400);
    const src = product.images[0].src;
    const details = getProductDetails(product);
    // Sample data has one photo per product, so the gallery adds close-up crops of it.
    // Products can set their own focal points where the subject is off-centre.
    const crops = details.crops ?? [
      { zoom: 1.6, x: 0.5, y: 0.5 },
      { zoom: 2.2, x: 0.5, y: 0.42 },
      { zoom: 2.2, x: 0.5, y: 0.62 },
    ];
    const { crops: _omit, ...rest } = details;
    return mockDelay({ ...product, ...rest, gallery: [{ src }, ...crops.map((crop) => ({ src, ...crop }))] }, 500);
  },

  async reviews(product) {
    if (USE_MOCK_DATA) {
      return mockDelay({ items: getSampleReviews(product), breakdown: ratingBreakdown(product.rating, product.reviewCount) }, 600);
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
    const others = products.filter((item) => item.id !== product.id);
    const same = others.filter((item) => item.category === product.category).sort(sorters.popular);
    const rest = others.filter((item) => item.category !== product.category).sort(sorters.popular);
    return mockDelay([...same, ...rest].slice(0, limit), 700);
  },

  /** Quick results for the search panel. Resolves to an array of products. */
  async search(term, limit = 5) {
    const q = term.trim();
    if (!q) return [];
    if (USE_MOCK_DATA) return listMock({ search: q, limit });
    return (await fetchProducts({ q, limit })).items;
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
      // The whole sample catalogue is already cached, so anything missing doesn't exist.
      missing.forEach((id) => unavailable.add(id));
      notify();
      return;
    }
    missing.forEach((id) => inFlight.add(id));
    try {
      await fetchProducts({ ids: missing, limit: missing.length });
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
    if (USE_MOCK_DATA) return mockDelay(categories, 300);
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
    const collection = findCollection(slug);
    if (!collection) return mockDelay(null, 400);
    const items = collection.productIds.map((id) => products.find((item) => item.id === id)).filter(Boolean);
    if (sort !== 'curated' && sorters[sort]) items.sort(sorters[sort]);
    return mockDelay({ collection, products: items }, 500);
  },

  async testimonials() {
    if (USE_MOCK_DATA) return mockDelay(testimonials, 300);
    const { data } = await api.get('/reviews/featured');
    return data;
  },
};
