/**
 * The database's own rules (docs/DATA_MODEL.md): bad data is refused by PostgreSQL itself, whatever
 * writes it (the API, an admin tool, an import or a bug). Each case inserts directly with SQL.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sql, type SQL } from 'drizzle-orm';
import { testApi } from './helpers.ts';

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => (api = await testApi()));
after(() => api.close());

/** Runs `query` and asserts PostgreSQL rejects it with the constraint `name`. */
async function refusedBy(name: string, query: SQL) {
  await assert.rejects(api.db.execute(query), (error: any) => {
    const message = `${error.message} ${error.cause?.message ?? ''} ${error.cause?.constraint ?? ''}`;
    assert.match(message, new RegExp(name), `expected ${name}, got: ${message}`);
    return true;
  });
}

let n = 0;
/** An INSERT for a valid order, with any columns overridden. */
function order(overrides: Record<string, string | number> = {}) {
  n += 1;
  const row: Record<string, string | number> = {
    id: `'NV-DB${n}'`, checkout_id: 'gen_random_uuid()', status: `'paid'`, currency: `'USD'`, email: `'a@example.com'`, phone: `'1'`,
    marketing: 'false', shipping_address: `'{}'`, billing_address: `'{}'`, shipping_label: `'Standard'`, shipping_eta: `'3–5 days'`,
    delivery_min_date: `'2026-12-01'`, delivery_max_date: `'2026-12-03'`,
    subtotal_cents: 10000, discount_cents: 1000, shipping_cents: 500, total_cents: 9500, payment_method: `'card'`,
    ...overrides,
  };
  return sql.raw(`INSERT INTO orders (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).join(', ')})`);
}

describe('allowed values are enforced by the database', () => {
  it('accepts a valid order', async () => {
    await api.db.execute(order());
  });

  it('refuses statuses, methods and kinds outside their lists', async () => {
    await refusedBy('orders_status_check', order({ status: `'banana'` }));
    await refusedBy('orders_payment_method_check', order({ payment_method: `'bitcoin'` }));
    await refusedBy('users_role_check', sql`INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES ('u-x', 'x@example.com', 'x', 'A', 'B', 'superadmin')`);
    await refusedBy('reviews_status_check', sql`INSERT INTO reviews (id, product_id, rating, title, body, display_name, location, status) VALUES ('r-x', 'p-001', 5, 't', 'b', 'n', 'l', 'spam-ok')`);
    await refusedBy('product_images_kind_check', sql`INSERT INTO product_images (id, product_id, kind, url, position) VALUES ('i-x', 'p-001', 'poster', 'u', 9)`);
    await refusedBy('collections_tone_check', sql`INSERT INTO collections (slug, name, eyebrow, tagline, description, image_url, tone, position) VALUES ('c-x', 'n', 'e', 't', 'd', 'u', 'neon', 9)`);
    await refusedBy('support_messages_status_check', sql`INSERT INTO support_messages (ticket, name, email, topic, message, status) VALUES ('SUP-X', 'n', 'a@example.com', 't', 'm', 'lost')`);
    await refusedBy('products_size_guide_check', sql`UPDATE products SET size_guide = 'hats' WHERE id = 'p-001'`);
  });

  it('keeps order money consistent', async () => {
    await refusedBy('orders_totals_check', order({ subtotal_cents: 100, discount_cents: 0, shipping_cents: 0, total_cents: -500 }));
    await refusedBy('orders_totals_check', order({ total_cents: 99999 }));
    await refusedBy('orders_totals_check', order({ subtotal_cents: 100, discount_cents: 200, shipping_cents: 0, total_cents: -100 }));
    await refusedBy('orders_currency_check', order({ currency: `'usd'` }));
    await refusedBy('orders_delivery_check', order({ delivery_min_date: `'2026-12-09'`, delivery_max_date: `'2026-12-01'` }));
    await refusedBy('order_items_price_check', sql`INSERT INTO order_items (id, order_id, slug, name, image_url, unit_price_cents, quantity) VALUES ('oi-x', 'NV-DB1', 's', 'n', 'u', -1, 1)`);
  });

  it('keeps promotions, products and shipping sensible', async () => {
    await refusedBy('promotions_value_check', sql`INSERT INTO promotions (code, type, value, label) VALUES ('HUGE', 'percent', 250, 'x')`);
    await refusedBy('promotions_value_check', sql`INSERT INTO promotions (code, type, value, label) VALUES ('ZERO', 'percent', 0, 'x')`);
    await refusedBy('promotions_dates_check', sql`INSERT INTO promotions (code, type, value, label, starts_at, ends_at) VALUES ('BACK', 'percent', 5, 'x', '2026-12-31', '2026-12-01')`);
    await refusedBy('products_rating_check', sql`UPDATE products SET rating_avg = 6 WHERE id = 'p-001'`);
    await refusedBy('shipping_methods_days_check', sql`UPDATE shipping_methods SET min_days = 5, max_days = 2 WHERE id = (SELECT id FROM shipping_methods LIMIT 1)`);
  });
});

describe('duplicates the database refuses', () => {
  it('treats emails case-insensitively: a second account can’t differ only in capitals', async () => {
    await refusedBy('users_email_check', sql`INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ('u-caps', 'Demo@Nova.Store', 'x', 'A', 'B')`);
    await refusedBy('users_email_check', sql`INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ('u-space', ' demo@nova.store', 'x', 'A', 'B')`);
    await refusedBy('users_email_unique', sql`INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ('u-same', 'demo@nova.store', 'x', 'A', 'B')`);
    await refusedBy('newsletter_subscribers_email_check', sql`INSERT INTO newsletter_subscribers (email, source) VALUES ('Ada@X.com', 't')`);
    await refusedBy('orders_email_check', order({ email: `'Guest@Example.com'` }));
  });

  it('allows one review per customer per product, and per purchased item', async () => {
    const review = (id: string, product: string, user: string | null, orderItem: string | null) =>
      sql`INSERT INTO reviews (id, product_id, user_id, order_item_id, rating, title, body, display_name, location)
          VALUES (${id}, ${product}, ${user}, ${orderItem}, 5, 't', 'b', 'n', 'l')`;
    await api.db.execute(review('r-1', 'p-001', 'u-demo', 'oi-1'));
    await refusedBy('reviews_user_product_idx', review('r-2', 'p-001', 'u-demo', null));
    await refusedBy('reviews_order_item_idx', review('r-3', 'p-104', null, 'oi-1'));
    await api.db.execute(review('r-4', 'p-104', 'u-demo', null)); // a different product is fine
    await api.db.execute(review('r-5', 'p-001', null, null)); // imported reviews have no user and are exempt
  });

  it('keeps one image per slot and one product per collection position', async () => {
    await refusedBy('product_images_product_idx', sql`INSERT INTO product_images (id, product_id, kind, url, position) SELECT 'i-dup', product_id, kind, 'u', position FROM product_images LIMIT 1`);
    // A product not yet in the collection, put at a position that's already taken.
    await refusedBy(
      'collection_products_position_idx',
      sql`INSERT INTO collection_products (collection_slug, product_id, position)
          SELECT c.collection_slug, p.id, c.position FROM collection_products c CROSS JOIN products p
          WHERE NOT EXISTS (SELECT 1 FROM collection_products x WHERE x.collection_slug = c.collection_slug AND x.product_id = p.id)
          LIMIT 1`,
    );
  });

  it('won’t hard-delete a product that has reviews (unpublish it instead)', async () => {
    await refusedBy('reviews_product_id_products_id_fk', sql`DELETE FROM products WHERE id = 'p-001'`);
  });
});
