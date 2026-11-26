import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { orderItems, orders } from '../src/db/schema.ts';
import { testApi } from './helpers.ts';

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => (api = await testApi()));
after(() => api.close());

describe('POST /cart/promo', () => {
  it('returns the promotion for a valid code, case-insensitively', async () => {
    const res = await api.call('POST', '/cart/promo', { body: { code: ' nova10 ', subtotal: 20 } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { code: 'NOVA10', type: 'percent', value: 10, label: '10% off your order', minSubtotal: 0 });
  });

  it('rejects an unknown code with invalid_promo, and a low subtotal with promo_min_subtotal', async () => {
    const unknown = await api.call('POST', '/cart/promo', { body: { code: 'FREE100', subtotal: 20 } });
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.code, 'invalid_promo');
    const low = await api.call('POST', '/cart/promo', { body: { code: 'WELCOME15', subtotal: 149.99 } });
    assert.equal(low.status, 422);
    assert.equal(low.body.code, 'promo_min_subtotal');
    assert.match(low.body.message, /over \$150/);
    assert.equal((await api.call('POST', '/cart/promo', { body: { code: 'WELCOME15', subtotal: 150 } })).status, 200);
  });
});

describe('POST /newsletter', () => {
  it('subscribes, and subscribing twice is fine', async () => {
    for (let i = 0; i < 2; i += 1) {
      const res = await api.call('POST', '/newsletter', { body: { email: 'Reader@Example.com' } });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { email: 'reader@example.com', subscribed: true });
    }
  });
});

describe('POST /support/messages', () => {
  const message = { name: 'Ada', email: 'ada@example.com', order: '', topic: 'Delivery', message: 'Where is my parcel? It has been a week.' };

  it('creates a ticket and emails the support inbox', async () => {
    const res = await api.call('POST', '/support/messages', { body: message });
    assert.equal(res.status, 201);
    assert.match(res.body.ticket, /^SUP-\d{6}$/);
    await new Promise((r) => setImmediate(r));
    const email = api.mailer.outbox.at(-1)!;
    assert.equal(email.to, 'support@nova.test');
    assert.ok(email.subject.includes(res.body.ticket));
  });

  it('checks the topic and message length', async () => {
    const res = await api.call('POST', '/support/messages', { body: { ...message, topic: 'Other', message: 'Too short' } });
    assert.equal(res.status, 422);
    assert.equal(res.body.fields.topic, 'Choose what your message is about');
    assert.equal(res.body.fields.message, 'Tell us a little more — at least 20 characters');
  });
});

describe('orders (reading only, until payments are connected)', () => {
  it('lists the signed-in user’s orders, and requires sign-in', async () => {
    assert.equal((await api.call('GET', '/me/orders')).status, 401);
    const { token } = await api.register();
    const res = await api.call('GET', '/me/orders', { token });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { items: [], nextCursor: null, counts: { All: 0, Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 } });
  });

  /** Inserts orders straight into the database (placing orders arrives with the payment phase). */
  async function addOrders(userId: string, email: string, statuses: (typeof orders.$inferInsert)['status'][], createdAt?: Date) {
    const address = { firstName: 'A', lastName: 'B', address1: '1 High St', city: 'London', postalCode: 'SW1A 1AA', country: 'GB' };
    const ids: string[] = [];
    for (const [i, status] of statuses.entries()) {
      const id = `NV-${userId.slice(-4)}-${String(i).padStart(3, '0')}`;
      ids.push(id);
      await api.db.insert(orders).values({
        id, checkoutId: crypto.randomUUID(), userId, status, currency: 'USD', email, phone: '+44 20 7946 0958', marketing: false,
        shippingAddress: address, billingAddress: address, shippingLabel: 'Standard', shippingEta: '3–5 days',
        deliveryMinDate: '2026-12-01', deliveryMaxDate: '2026-12-03', subtotalCents: 1000, discountCents: 0, shippingCents: 0,
        totalCents: 1000, paymentMethod: 'card', paymentBrand: 'visa', paymentLast4: '4242',
        ...(createdAt ? { createdAt } : {}),
      });
      await api.db.insert(orderItems).values({ id: `oi-${id}`, orderId: id, slug: 'x', name: 'Item', imageUrl: 'x', unitPriceCents: 1000, quantity: 1 });
    }
    return ids;
  }

  it('pages through order history: every order exactly once, newest first, even with identical timestamps', async () => {
    const { token, user } = await api.register();
    const sameMoment = new Date('2026-11-01T10:00:00.123456Z');
    const ids = await addOrders(user.id, user.email, Array(25).fill('paid'), sameMoment);
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const res = await api.call('GET', `/me/orders?limit=10${cursor ? `&cursor=${cursor}` : ''}`, { token });
      assert.equal(res.status, 200);
      seen.push(...res.body.items.map((order: { id: string }) => order.id));
      assert.equal(res.body.counts.All, 25);
      cursor = res.body.nextCursor;
      pages += 1;
    } while (cursor && pages < 10);
    assert.equal(pages, 3);
    assert.equal(seen.length, 25);
    assert.deepEqual([...seen].sort(), [...ids].sort(), 'no order skipped or repeated');
    assert.deepEqual(seen, [...ids].sort().reverse(), 'ties are broken by id, newest id first');
  });

  it('counts every status for the tabs, filters by status, and hides unpaid orders', async () => {
    const { token, user } = await api.register();
    await addOrders(user.id, user.email, ['paid', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded', 'pending_payment', 'payment_failed']);
    const all = await api.call('GET', '/me/orders?limit=50', { token });
    assert.deepEqual(all.body.counts, { All: 6, Processing: 2, Shipped: 1, Delivered: 1, Cancelled: 2 });
    assert.equal(all.body.items.length, 6, 'pending and failed payments never appear in history');
    const cancelled = await api.call('GET', '/me/orders?status=Cancelled', { token });
    assert.deepEqual(cancelled.body.items.map((order: { status: string }) => order.status), ['Cancelled', 'Cancelled']);
    assert.equal(cancelled.body.counts.All, 6, 'counts ignore the filter, so every tab keeps its number');
    assert.equal((await api.call('GET', '/me/orders?status=Lost', { token })).status, 422);
    assert.equal((await api.call('GET', '/me/orders?limit=500', { token })).status, 422);
  });

  it('never shows another user’s orders, whatever the cursor', async () => {
    const owner = await api.register();
    const [theirs] = await addOrders(owner.user.id, owner.user.email, ['paid']);
    const { token } = await api.register();
    const res = await api.call('GET', `/me/orders?cursor=${theirs}`, { token });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items, []);
    assert.equal((await api.call('GET', `/orders/${theirs}`, { token })).status, 404);
    assert.equal((await api.call('GET', `/orders/${theirs}`, { token: owner.token })).status, 200);
  });

  it('hides orders that don’t exist or aren’t yours as not_found', async () => {
    const res = await api.call('GET', '/orders/NV-NOPE000000');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'not_found');
  });

  it('answers 501 for placing and cancelling, with a message shoppers can read', async () => {
    const res = await api.call('POST', '/orders', { body: {} });
    assert.equal(res.status, 501);
    assert.equal(res.body.code, 'not_implemented');
  });
});

describe('request size', () => {
  it('refuses bodies over 100 KB with 413 before reading them', async () => {
    const huge = await api.call('POST', '/auth/login', { body: { email: 'a@example.com', password: 'x'.repeat(200 * 1024) } });
    assert.equal(huge.status, 413);
    assert.equal(huge.body.code, 'payload_too_large');
    const normal = await api.call('POST', '/support/messages', {
      body: { name: 'A', email: 'a@example.com', topic: 'Delivery', message: 'Where is my parcel? '.repeat(200) },
    });
    assert.equal(normal.status, 201, 'a long but real message still fits');
  });
});

describe('unknown routes', () => {
  it('answer not_found in the error format', async () => {
    const res = await api.call('GET', '/nothing-here');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'not_found');
  });
});
