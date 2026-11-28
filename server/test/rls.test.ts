/**
 * The database's own protection, independent of the API code: what the API's role (nova_app) can do
 * when it runs arbitrary SQL, as it would after a SQL injection or a missing WHERE clause.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { setAccess, withAccess } from '../src/db/access.ts';
import { sha256 } from '../src/lib/crypto.ts';
import { testApi } from './helpers.ts';

let api: Awaited<ReturnType<typeof testApi>>;
let ada: Awaited<ReturnType<typeof api.register>>;
let bo: Awaited<ReturnType<typeof api.register>>;
const address = { label: 'Home', firstName: 'A', lastName: 'B', address1: '1 High St', city: 'London', postalCode: 'SW1A 1AA', country: 'GB', phone: '+44 20 7946 0958' };

const rows = async (query: ReturnType<typeof sql>, run = api.db) =>
  ((await run.execute(query)) as unknown as { rows: Record<string, unknown>[] }).rows;
const deniedBy = async (query: ReturnType<typeof sql>, pattern: RegExp) =>
  assert.rejects(api.db.execute(query), (error: any) => {
    assert.match(String(error.cause?.message ?? error.message), pattern);
    return true;
  });

before(async () => {
  api = await testApi();
  ada = await api.register();
  bo = await api.register();
  for (const { token } of [ada, bo]) assert.equal((await api.call('POST', '/me/addresses', { token, body: address })).status, 201);
  // A guest order and one of Bo's, written as checkout will (as the owner here, until checkout exists).
  await api.asOwner(async (db) => {
    for (const [id, userId, email, guestToken] of [
      ['NV-BO', bo.user.id, bo.user.email, null],
      ['NV-GUEST', null, 'guest@example.com', sha256('guest-secret')],
    ] as const) {
      await db.execute(sql`
        INSERT INTO orders (id, checkout_id, user_id, guest_token_hash, status, currency, email, phone, marketing, shipping_address,
          billing_address, shipping_label, shipping_eta, delivery_min_date, delivery_max_date, subtotal_cents, discount_cents,
          shipping_cents, total_cents, payment_method)
        VALUES (${id}, gen_random_uuid(), ${userId}, ${guestToken}, 'paid', 'USD', ${email}, '1', false, '{}', '{}', 'Standard', 'x',
          '2026-12-01', '2026-12-02', 1000, 0, 0, 1000, 'card')`);
    }
  });
});
after(() => api.close());

describe('the API’s database role', () => {
  it('runs as nova_app, which can’t change the schema or switch off the policies', async () => {
    assert.deepEqual(await rows(sql`SELECT current_user AS role`), [{ role: 'nova_app' }]);
    await deniedBy(sql`DROP TABLE addresses`, /must be (the )?owner/);
    await deniedBy(sql`ALTER TABLE addresses DISABLE ROW LEVEL SECURITY`, /must be (the )?owner/);
    await deniedBy(sql`TRUNCATE users`, /permission denied/);
  });

  it('can’t delete accounts or orders: they’re anonymised instead', async () => {
    await deniedBy(sql`DELETE FROM orders`, /permission denied/);
    await deniedBy(sql`DELETE FROM users`, /permission denied/);
  });
});

describe('row-level security', () => {
  it('shows no private rows to a query that doesn’t say who it acts for', async () => {
    assert.equal((await rows(sql`SELECT id FROM addresses`)).length, 0);
    assert.equal((await rows(sql`SELECT id FROM orders`)).length, 0);
    assert.equal((await rows(sql`SELECT id FROM order_items`)).length, 0);
    assert.equal((await rows(sql`SELECT ticket FROM support_messages`)).length, 0);
    // …although the rows are there.
    assert.ok((await api.asOwner((db) => rows(sql`SELECT id FROM addresses`, db))).length >= 2);
  });

  it('keeps each user to their own addresses, even with no WHERE clause', async () => {
    await withAccess(api.db, { userId: ada.user.id }, async (tx) => {
      const mine = await rows(sql`SELECT user_id FROM addresses`, tx);
      assert.deepEqual([...new Set(mine.map((row) => row.user_id))], [ada.user.id]);
      const changed = await rows(sql`UPDATE addresses SET city = 'Hacked' WHERE user_id = ${bo.user.id} RETURNING id`, tx);
      assert.equal(changed.length, 0, 'Bo’s address is invisible, so nothing is updated');
    });
    await assert.rejects(
      withAccess(api.db, { userId: ada.user.id }, (tx) =>
        tx.execute(sql`INSERT INTO addresses (id, user_id, first_name, last_name, address1, city, postal_code, country, phone)
          VALUES ('addr-planted', ${bo.user.id}, 'A', 'B', '1', 'x', 'x', 'GB', '1')`),
      ),
      (error: any) => /row-level security/.test(String(error.cause?.message ?? error.message)),
      'can’t write an address into someone else’s account',
    );
  });

  it('shows an order only to its owner or to someone with its guest token', async () => {
    const seen = (access: Parameters<typeof setAccess>[1]) =>
      withAccess(api.db, access, async (tx) => (await rows(sql`SELECT id FROM orders ORDER BY id`, tx)).map((row) => row.id));
    assert.deepEqual(await seen({ userId: ada.user.id }), []);
    assert.deepEqual(await seen({ userId: bo.user.id }), ['NV-BO']);
    assert.deepEqual(await seen({ orderTokenHash: sha256('guest-secret') }), ['NV-GUEST']);
    assert.deepEqual(await seen({ orderTokenHash: sha256('a guess') }), []);
    assert.deepEqual(await seen({ verifiedEmail: 'guest@example.com' }), ['NV-GUEST'], 'a verified owner of the email');
  });

  it('lets an account change only itself', async () => {
    const changed = await withAccess(api.db, { userId: ada.user.id }, (tx) =>
      rows(sql`UPDATE users SET password_hash = 'planted' WHERE id = ${bo.user.id} RETURNING id`, tx),
    );
    assert.equal(changed.length, 0);
    assert.equal((await api.call('POST', '/auth/login', { body: { email: bo.user.email, password: bo.password } })).status, 200);
  });

  it('never carries one request’s access into the next', async () => {
    await withAccess(api.db, { userId: ada.user.id }, async () => {});
    assert.equal((await rows(sql`SELECT id FROM addresses`)).length, 0);
  });
});
