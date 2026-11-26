/**
 * Database schema. One table per section of docs/DATA_MODEL.md; read that file for the reasoning.
 * Money is integer cents (`*_cents`). Emails are stored lowercased and trimmed.
 * Change this file, then run `npm run db:generate` to write a migration in ./drizzle.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};
const ts = (name: string) => timestamp(name, { withTimezone: true });

// ---------------------------------------------------------------- Accounts

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  marketing: boolean('marketing').notNull().default(false),
  role: text('role', { enum: ['customer', 'admin'] }).notNull().default('customer'),
  emailVerifiedAt: ts('email_verified_at'),
  deletedAt: ts('deleted_at'),
  ...timestamps,
});

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: ts('created_at').notNull().defaultNow(),
    lastUsedAt: ts('last_used_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
    revokedAt: ts('revoked_at'),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const passwordResets = pgTable('password_resets', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const addresses = pgTable(
  'addresses',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    address1: text('address1').notNull(),
    address2: text('address2'),
    city: text('city').notNull(),
    region: text('region'),
    postalCode: text('postal_code'),
    country: char('country', { length: 2 }).notNull(),
    phone: text('phone'),
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('addresses_user_idx').on(t.userId),
    // At most one default per user, guaranteed by the database.
    uniqueIndex('addresses_one_default_idx').on(t.userId).where(sql`${t.isDefault}`),
  ],
);

// ---------------------------------------------------------------- Catalogue

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull(),
  imageUrl: text('image_url').notNull(),
  position: integer('position').notNull(),
});

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    categoryId: text('category_id').notNull().references(() => categories.id),
    priceCents: integer('price_cents').notNull(),
    compareAtCents: integer('compare_at_cents'),
    badge: text('badge'),
    stockCount: integer('stock_count').notNull().default(0),
    colors: jsonb('colors').$type<{ name: string; hex: string }[]>().notNull().default([]),
    sizes: text('sizes').array().notNull().default(sql`'{}'::text[]`),
    isFeatured: boolean('is_featured').notNull().default(false),
    isBestSeller: boolean('is_best_seller').notNull().default(false),
    published: boolean('published').notNull().default(true),
    // Review aggregates, kept in step with approved reviews. rating_counts is [1★, 2★, 3★, 4★, 5★].
    ratingAvg: numeric('rating_avg', { precision: 2, scale: 1, mode: 'number' }).notNull().default(0),
    reviewCount: integer('review_count').notNull().default(0),
    ratingCounts: integer('rating_counts').array().notNull().default(sql`'{0,0,0,0,0}'::integer[]`),
    highlights: text('highlights').array().notNull().default(sql`'{}'::text[]`),
    specs: jsonb('specs').$type<[string, string][]>().notNull().default([]),
    care: text('care'),
    sizeGuide: text('size_guide', { enum: ['apparel', 'shoes'] }),
    ...timestamps,
  },
  (t) => [
    index('products_category_idx').on(t.categoryId),
    check('products_price_check', sql`${t.priceCents} >= 0`),
    check('products_compare_at_check', sql`${t.compareAtCents} IS NULL OR ${t.compareAtCents} > ${t.priceCents}`),
    // Stock can never go negative, even if two orders race for the last item.
    check('products_stock_check', sql`${t.stockCount} >= 0`),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    // 'card' images are the product's `images`; 'gallery' images are the product page `gallery`.
    kind: text('kind', { enum: ['card', 'gallery'] }).notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull(),
    zoom: numeric('zoom', { mode: 'number' }),
    focalX: numeric('focal_x', { mode: 'number' }),
    focalY: numeric('focal_y', { mode: 'number' }),
  },
  (t) => [index('product_images_product_idx').on(t.productId, t.kind, t.position)],
);

export const collections = pgTable('collections', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  eyebrow: text('eyebrow').notNull(),
  tagline: text('tagline').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url').notNull(),
  tone: text('tone', { enum: ['dark', 'light'] }).notNull(),
  position: integer('position').notNull(),
  published: boolean('published').notNull().default(true),
});

export const collectionProducts = pgTable(
  'collection_products',
  {
    collectionSlug: text('collection_slug').notNull().references(() => collections.slug, { onDelete: 'cascade' }),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (t) => [primaryKey({ columns: [t.collectionSlug, t.productId] })],
);

export const reviews = pgTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    orderItemId: text('order_item_id'),
    // Imported reviews have no order item but were verified at the source.
    verified: boolean('verified').notNull().default(false),
    rating: smallint('rating').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    displayName: text('display_name').notNull(),
    location: text('location').notNull(),
    variant: text('variant'),
    helpfulCount: integer('helpful_count').notNull().default(0),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
    isFeatured: boolean('is_featured').notNull().default(false),
    avatarUrl: text('avatar_url'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('reviews_product_idx').on(t.productId, t.status, t.createdAt),
    check('reviews_rating_check', sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

// ---------------------------------------------------------------- Promotions and shipping

export const promotions = pgTable('promotions', {
  code: text('code').primaryKey(),
  type: text('type', { enum: ['percent', 'shipping'] }).notNull(),
  value: integer('value').notNull(),
  label: text('label').notNull(),
  minSubtotalCents: integer('min_subtotal_cents').notNull().default(0),
  startsAt: ts('starts_at'),
  endsAt: ts('ends_at'),
  maxRedemptions: integer('max_redemptions'),
  redemptions: integer('redemptions').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export const shippingMethods = pgTable('shipping_methods', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  eta: text('eta').notNull(),
  priceCents: integer('price_cents').notNull(),
  freeOverCents: integer('free_over_cents'),
  minDays: integer('min_days').notNull(),
  maxDays: integer('max_days').notNull(),
  countries: char('countries', { length: 2 }).array(),
  position: integer('position').notNull(),
  active: boolean('active').notNull().default(true),
});

// ---------------------------------------------------------------- Orders and payments
// Created now so the schema is complete; the endpoints that use them come in the next phase.

export const ORDER_STATUSES = ['pending_payment', 'payment_failed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    checkoutId: uuid('checkout_id').notNull().unique(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    guestTokenHash: text('guest_token_hash'),
    status: text('status', { enum: ORDER_STATUSES }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    marketing: boolean('marketing').notNull(),
    shippingAddress: jsonb('shipping_address').notNull(),
    billingAddress: jsonb('billing_address').notNull(),
    shippingMethodId: text('shipping_method_id').references(() => shippingMethods.id),
    shippingLabel: text('shipping_label').notNull(),
    shippingEta: text('shipping_eta').notNull(),
    deliveryMinDate: date('delivery_min_date').notNull(),
    deliveryMaxDate: date('delivery_max_date').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').notNull(),
    shippingCents: integer('shipping_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    promoCode: text('promo_code').references(() => promotions.code),
    promo: jsonb('promo'),
    paymentMethod: text('payment_method', { enum: ['card', 'paypal', 'applepay'] }).notNull(),
    paymentBrand: text('payment_brand'),
    paymentLast4: text('payment_last4'),
    paymentProvider: text('payment_provider'),
    paymentReference: text('payment_reference').unique(),
    trackingCarrier: text('tracking_carrier'),
    trackingNumber: text('tracking_number'),
    paidAt: ts('paid_at'),
    shippedAt: ts('shipped_at'),
    deliveredAt: ts('delivered_at'),
    cancelledAt: ts('cancelled_at'),
    refundedAt: ts('refunded_at'),
    ...timestamps,
  },
  (t) => [
    index('orders_user_idx').on(t.userId, t.createdAt),
    index('orders_email_idx').on(t.email),
    index('orders_status_idx').on(t.status, t.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    imageUrl: text('image_url').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    color: text('color'),
    size: text('size'),
  },
  (t) => [index('order_items_order_idx').on(t.orderId), check('order_items_quantity_check', sql`${t.quantity} BETWEEN 1 AND 10`)],
);

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    orderId: text('order_id').references(() => orders.id),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    receivedAt: ts('received_at').notNull().defaultNow(),
  },
  // A webhook delivered twice is recorded (and applied) once.
  (t) => [uniqueIndex('payment_events_provider_event_idx').on(t.provider, t.eventId)],
);

// ---------------------------------------------------------------- Engagement

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  email: text('email').primaryKey(),
  source: text('source').notNull(),
  confirmedAt: ts('confirmed_at'),
  unsubscribedAt: ts('unsubscribed_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const supportMessages = pgTable('support_messages', {
  ticket: text('ticket').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  orderId: text('order_id'),
  topic: text('topic').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
  createdAt: ts('created_at').notNull().defaultNow(),
});
