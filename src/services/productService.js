import { api, mockDelay, USE_MOCK_DATA } from './api';
import { products } from '../data/products';
import { categories } from '../data/categories';
import { testimonials } from '../data/testimonials';
import { findCollection } from '../data/collections';
import { getProductDetails, getSampleReviews, ratingBreakdown } from '../data/productDetails';

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
  async list(params = {}) {
    if (USE_MOCK_DATA) return mockDelay(listMock(params));
    const { data } = await api.get('/products', { params });
    return data;
  },

  /** Filtered, sorted and paginated catalogue: { items, total, facets }. */
  async query(params = {}) {
    if (USE_MOCK_DATA) return mockDelay(catalogueMock(params), 450);
    const { categories: selected, ...rest } = params;
    const { data } = await api.get('/products', {
      params: { ...rest, categories: selected?.length ? selected.join(',') : undefined },
    });
    return data;
  },

  async getBySlug(slug) {
    if (USE_MOCK_DATA) return mockDelay(products.find((item) => item.slug === slug) ?? null);
    const { data } = await api.get(`/products/${slug}`);
    return data;
  },

  /**
   * Full product for the details page: product fields plus gallery, highlights,
   * specs, care and size guide. Resolves to null when the slug does not exist.
   */
  async getDetail(slug) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.get(`/products/${slug}`, { params: { include: 'details' } });
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
      return data;
    }
    const others = products.filter((item) => item.id !== product.id);
    const same = others.filter((item) => item.category === product.category).sort(sorters.popular);
    const rest = others.filter((item) => item.category !== product.category).sort(sorters.popular);
    return mockDelay([...same, ...rest].slice(0, limit), 700);
  },

  /** Synchronous lookup used by the instant search panel and the cart. */
  searchLocal(term, limit = 5) {
    return term.trim() ? listMock({ search: term, limit }) : [];
  },

  findById(id) {
    return products.find((item) => item.id === id) ?? null;
  },

  async categories() {
    if (USE_MOCK_DATA) return mockDelay(categories, 300);
    const { data } = await api.get('/categories');
    return data;
  },

  /** A curated collection with its products: { collection, products } or null. */
  async collection(slug, { sort = 'curated' } = {}) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.get(`/collections/${slug}`, { params: { sort } });
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
