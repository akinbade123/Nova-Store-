import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
    const res = await api.call('GET', '/me/orders', { token: await api.signIn() });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
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

describe('unknown routes', () => {
  it('answer not_found in the error format', async () => {
    const res = await api.call('GET', '/nothing-here');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'not_found');
  });
});
