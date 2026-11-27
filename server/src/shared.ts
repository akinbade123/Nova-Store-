/**
 * The storefront's own rules and sample data, imported directly so the browser and the server
 * can't drift apart. This file is the only place the server reaches into ../src; if the two are
 * ever split into separate repositories, replace these imports with a shared package.
 */
// @ts-nocheck: plain JavaScript modules from the storefront, without type declarations.
export { EMAIL_PATTERN, COUNTRIES, validatePhone } from '../../src/utils/validation.js';
export { validateAddress } from '../../src/components/checkout/checkoutSchema.js';
export { products as sampleProducts } from '../../src/data/products.js';
export { categories as sampleCategories } from '../../src/data/categories.js';
export { collections as sampleCollections } from '../../src/data/collections.js';
export { testimonials as sampleTestimonials } from '../../src/data/testimonials.js';
export { SHIPPING_METHODS as sampleShippingMethods } from '../../src/data/shipping.js';
export { getProductDetails, getSampleReviews, ratingBreakdown } from '../../src/data/productDetails.js';
