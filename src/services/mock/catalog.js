/*
 * Sample-data implementation of the catalogue endpoints. productService loads this file
 * with a dynamic import() only in sample-data mode, so production builds that talk to the
 * real API never download the sample catalogue.
 */
import { products } from '../../data/products';
import { categories } from '../../data/categories';
import { testimonials } from '../../data/testimonials';
import { findCollection } from '../../data/collections';
import { getProductDetails, getSampleReviews, ratingBreakdown } from '../../data/productDetails';

export { products, categories, testimonials };

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
export function list({ category, featured, bestSeller, search, sort, limit } = {}) {
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
 * Catalogue query for the Shop page. Mirrors the GET /products response: { items, total, facets }.
 * Category facet counts ignore the category filter itself, so each option
 * shows how many results selecting it would add.
 */
export function query({ q, categories: selected = [], minPrice, maxPrice, minRating, inStock, onSale, sort = 'featured', limit = 12, offset = 0 } = {}) {
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

  return { items: matched.slice(offset, offset + limit), total: matched.length, facets };
}

export const bySlug = (slug) => products.find((item) => item.slug === slug) ?? null;

/** Product fields plus gallery, highlights, specs, care and size guide, or null. */
export function detail(slug) {
  const product = bySlug(slug);
  if (!product) return null;
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
  return { ...product, ...rest, gallery: [{ src }, ...crops.map((crop) => ({ src, ...crop }))] };
}

export const reviews = (product) => ({
  items: getSampleReviews(product),
  breakdown: ratingBreakdown(product.rating, product.reviewCount),
});

/** Same-category products first, topped up with popular items from elsewhere. */
export function related(product, limit) {
  const others = products.filter((item) => item.id !== product.id);
  const same = others.filter((item) => item.category === product.category).sort(sorters.popular);
  const rest = others.filter((item) => item.category !== product.category).sort(sorters.popular);
  return [...same, ...rest].slice(0, limit);
}

/** A curated collection with its products: { collection, products } or null. */
export function collection(slug, sort) {
  const found = findCollection(slug);
  if (!found) return null;
  const items = found.productIds.map((id) => products.find((item) => item.id === id)).filter(Boolean);
  if (sort !== 'curated' && sorters[sort]) items.sort(sorters[sort]);
  return { collection: found, products: items };
}
