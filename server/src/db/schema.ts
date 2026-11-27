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
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};
const ts = (name: string) => timestamp(name, { withTimezone: true });

/**
 * A CHECK that `column` holds one of `values`. The `enum` option on a text column only types the code;
 * this makes the database itself refuse anything else, whether it comes from the API, an admin tool,
 * an import or a bug. The lists below are the single source for both.
 */
const oneOf = (column: AnyPgColumn, values: readonly string[]) =>
  sql`${column} IN (${sql.raw(values.map((value) => `'${value}'`).join(', '))})`;

/**
 * Emails are stored lowercased and trimmed (the API does it on the way in). This check guarantees it,
 * which makes each plain unique index on email case-insensitive and keeps every account reachable by
 * sign-in, which lowercases what's typed.
 */
const normalisedEmail = (name: string, column: AnyPgColumn) => check(name, sql`${column} = lower(btrim(${column}))`);

export const ROLES = ['customer', 'admin'] as const;
export const SIZE_GUIDES = ['apparel', 'shoes'] as const;
export const IMAGE_KINDS = ['card', 'gallery'] as const;
export const COLLECTION_TONES = ['dark', 'light'] as const;
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const PROMOTION_TYPES = ['percent', 'shipping'] as const;
export const PAYMENT_METHODS = ['card', 'paypal', 'applepay'] as const;
export const SUPPORT_STATUSES = ['open', 'closed'] as const;

// ---------------------------------------------------------------- Accounts

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  marketing: boolean('marketing').notNull().default(false),
  role: text('role', { enum: ROLES }).notNull().default('customer'),
  emailVerifiedAt: ts('email_verified_at'),
  deletedAt: ts('deleted_at'),
  ...timestamps,
}, (t) => [check('users_role_check', oneOf(t.role, ROLES)), normalisedEmail('users_email_check', t.email)]);

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

/**
 * Links that confirm an email address. Tied to the exact address they were sent to, so a link stops
 * mattering once the account's email changes. Only the token's hash is stored.
 */
export const emailVerifications = pgTable(
  'email_verifications',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    expiresAt: ts('expires_at').notNull(),
    usedAt: ts('used_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('email_verifications_user_idx').on(t.userId), normalisedEmail('email_verifications_email_check', t.email)],
);

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
    sizeGuide: text('size_guide', { enum: SIZE_GUIDES }),
    ...timestamps,
  },
  (t) => [
    index('products_category_idx').on(t.categoryId),
    // Search (GET /products?q=) matches '%text%' anywhere in this expression, which a normal index
    // can't help with. A trigram index can. Keep the expression identical to the one in products.ts.
    index('products_search_idx').using('gin', sql`(${t.name} || ' ' || ${t.categoryId} || ' ' || ${t.description}) gin_trgm_ops`),
    check('products_price_check', sql`${t.priceCents} >= 0`),
    check('products_compare_at_check', sql`${t.compareAtCents} IS NULL OR ${t.compareAtCents} > ${t.priceCents}`),
    // Stock can never go negative, even if two orders race for the last item.
    check('products_stock_check', sql`${t.stockCount} >= 0`),
    check('products_size_guide_check', sql`${t.sizeGuide} IS NULL OR ${oneOf(t.sizeGuide, SIZE_GUIDES)}`),
    check('products_rating_check', sql`${t.ratingAvg} BETWEEN 0 AND 5 AND ${t.reviewCount} >= 0`),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    // 'card' images are the product's `images`; 'gallery' images are the product page `gallery`.
    kind: text('kind', { enum: IMAGE_KINDS }).notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull(),
    zoom: numeric('zoom', { mode: 'number' }),
    focalX: numeric('focal_x', { mode: 'number' }),
    focalY: numeric('focal_y', { mode: 'number' }),
  },
  (t) => [
    // One image per slot; also the index for loading a product's images in order.
    uniqueIndex('product_images_product_idx').on(t.productId, t.kind, t.position),
    check('product_images_kind_check', oneOf(t.kind, IMAGE_KINDS)),
  ],
);

export const collections = pgTable('collections', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  eyebrow: text('eyebrow').notNull(),
  tagline: text('tagline').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url').notNull(),
  tone: text('tone', { enum: COLLECTION_TONES }).notNull(),
  position: integer('position').notNull(),
  published: boolean('published').notNull().default(true),
}, (t) => [check('collections_tone_check', oneOf(t.tone, COLLECTION_TONES))]);

export const collectionProducts = pgTable(
  'collection_products',
  {
    collectionSlug: text('collection_slug').notNull().references(() => collections.slug, { onDelete: 'cascade' }),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.collectionSlug, t.productId] }),
    uniqueIndex('collection_products_position_idx').on(t.collectionSlug, t.position),
  ],
);

export const reviews = pgTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    // Restrict: a product with reviews can't be deleted (that would silently erase them). Unpublish it instead.
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
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
    status: text('status', { enum: REVIEW_STATUSES }).notNull().default('pending'),
    isFeatured: boolean('is_featured').notNull().default(false),
    avatarUrl: text('avatar_url'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('reviews_product_idx').on(t.productId, t.status, t.createdAt),
    // One review per customer per product, and per purchased item. Imported reviews have neither, so they're exempt.
    uniqueIndex('reviews_user_product_idx').on(t.productId, t.userId).where(sql`${t.userId} IS NOT NULL`),
    uniqueIndex('reviews_order_item_idx').on(t.orderItemId).where(sql`${t.orderItemId} IS NOT NULL`),
    check('reviews_rating_check', sql`${t.rating} BETWEEN 1 AND 5`),
    check('reviews_status_check', oneOf(t.status, REVIEW_STATUSES)),
    check('reviews_helpful_check', sql`${t.helpfulCount} >= 0`),
  ],
);

// ---------------------------------------------------------------- Promotions and shipping

export const promotions = pgTable('promotions', {
  code: text('code').primaryKey(),
  type: text('type', { enum: PROMOTION_TYPES }).notNull(),
  value: integer('value').notNull(),
  label: text('label').notNull(),
  minSubtotalCents: integer('min_subtotal_cents').notNull().default(0),
  startsAt: ts('starts_at'),
  endsAt: ts('ends_at'),
  maxRedemptions: integer('max_redemptions'),
  redemptions: integer('redemptions').notNull().default(0),
  active: boolean('active').notNull().default(true),
}, (t) => [
  check('promotions_type_check', oneOf(t.type, PROMOTION_TYPES)),
  // A percentage between 1 and 100; free-shipping codes carry no value.
  check('promotions_value_check', sql`(${t.type} = 'percent' AND ${t.value} BETWEEN 1 AND 100) OR (${t.type} = 'shipping' AND ${t.value} = 0)`),
  check('promotions_amounts_check', sql`${t.minSubtotalCents} >= 0 AND ${t.redemptions} >= 0 AND (${t.maxRedemptions} IS NULL OR ${t.maxRedemptions} > 0)`),
  check('promotions_dates_check', sql`${t.startsAt} IS NULL OR ${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`),
]);

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
}, (t) => [
  check('shipping_methods_price_check', sql`${t.priceCents} >= 0 AND (${t.freeOverCents} IS NULL OR ${t.freeOverCents} >= 0)`),
  check('shipping_methods_days_check', sql`${t.minDays} >= 0 AND ${t.maxDays} >= ${t.minDays}`),
]);

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
    paymentMethod: text('payment_method', { enum: PAYMENT_METHODS }).notNull(),
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
    normalisedEmail('orders_email_check', t.email), // guest orders are matched to accounts by email
    check('orders_status_check', oneOf(t.status, ORDER_STATUSES)),
    check('orders_payment_method_check', oneOf(t.paymentMethod, PAYMENT_METHODS)),
    check('orders_currency_check', sql`${t.currency} ~ '^[A-Z]{3}$'`),
    // Money is never negative, the discount never exceeds the subtotal, and the total always adds up.
    check(
      'orders_totals_check',
      sql`${t.subtotalCents} >= 0 AND ${t.discountCents} BETWEEN 0 AND ${t.subtotalCents} AND ${t.shippingCents} >= 0
        AND ${t.totalCents} = ${t.subtotalCents} - ${t.discountCents} + ${t.shippingCents}`,
    ),
    check('orders_delivery_check', sql`${t.deliveryMaxDate} >= ${t.deliveryMinDate}`),
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
  (t) => [
    index('order_items_order_idx').on(t.orderId),
    check('order_items_quantity_check', sql`${t.quantity} BETWEEN 1 AND 10`),
    check('order_items_price_check', sql`${t.unitPriceCents} >= 0`),
  ],
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
}, (t) => [normalisedEmail('newsletter_subscribers_email_check', t.email)]);

export const supportMessages = pgTable('support_messages', {
  ticket: text('ticket').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  orderId: text('order_id'),
  topic: text('topic').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: SUPPORT_STATUSES }).notNull().default('open'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [check('support_messages_status_check', oneOf(t.status, SUPPORT_STATUSES))]);

/**
 * Rate-limit counters (src/lib/rateLimit.ts), one row per limit and client. Kept in the database, not
 * in memory, so every API instance counts against the same limit. Expired rows are purged.
 */
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull(),
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('rate_limits_reset_idx').on(t.resetAt)],
);
