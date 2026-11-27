import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { emailVerifications, orderItems, orders } from '../src/db/schema.ts';
import { testApi } from './helpers.ts';

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => (api = await testApi()));
after(() => api.close());

const settle = () => new Promise((resolve) => setImmediate(resolve)); // emails are sent in the background
const confirmLinkFor = (email: string) =>
  api.mailer.outbox.filter((m) => m.to === email && m.subject.includes('Confirm')).at(-1)?.text.match(/verify-email\?token=([\w-]+)/)?.[1];
const verify = (token: string) => api.call('POST', '/auth/verify-email', { body: { token } });

describe('email verification', () => {
  it('sends a link on sign-up; the link confirms the email once', async () => {
    const { token, user } = await api.register();
    assert.equal(user.emailVerified, false);
    await settle();
    const link = confirmLinkFor(user.email);
    assert.ok(link, 'a confirmation email was sent');
    const res = await verify(link!);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { verified: true, email: user.email });
    assert.equal((await api.call('GET', '/me', { token })).body.emailVerified, true);
    const again = await verify(link!);
    assert.equal(again.status, 400);
    assert.equal(again.body.code, 'invalid_token');
  });

  it('refuses an expired link', async () => {
    const { user } = await api.register();
    await settle();
    await api.db.update(emailVerifications).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(emailVerifications.userId, user.id));
    assert.equal((await verify(confirmLinkFor(user.email)!)).status, 400);
  });

  it('a link for the old address can’t confirm a changed email; the new address gets its own link', async () => {
    const { token, user, password } = await api.register();
    await settle();
    const oldLink = confirmLinkFor(user.email)!;
    const changed = await api.call('PATCH', '/me', { token, body: { email: 'changed-addr@example.com', currentPassword: password } });
    assert.equal(changed.body.emailVerified, false);
    assert.equal((await verify(oldLink)).status, 400, 'the old link no longer matches the account');
    await settle();
    assert.equal((await verify(confirmLinkFor('changed-addr@example.com')!)).status, 200);
  });

  it('resends only while unconfirmed, and needs sign-in', async () => {
    assert.equal((await api.call('POST', '/me/email-verification')).status, 401);
    const { token, user } = await api.register();
    const resend = await api.call('POST', '/me/email-verification', { token });
    assert.equal(resend.status, 202);
    await settle();
    assert.equal(api.mailer.outbox.filter((m) => m.to === user.email && m.subject.includes('Confirm')).length, 2);
    await verify(confirmLinkFor(user.email)!);
    assert.deepEqual((await api.call('POST', '/me/email-verification', { token })).body, { sent: false, alreadyVerified: true });
  });

  it('limits resends per account, so the button can’t flood an inbox', async () => {
    const limited = await testApi({ rateLimits: true });
    try {
      const { token } = await limited.register();
      const statuses = [];
      for (let i = 0; i < 4; i += 1) statuses.push((await limited.call('POST', '/me/email-verification', { token })).status);
      assert.deepEqual(statuses, [202, 202, 202, 429]);
    } finally {
      await limited.close();
    }
  });

  it('links guest orders placed with the email only once it’s confirmed', async () => {
    const { token, user } = await api.register();
    const address = { firstName: 'A', lastName: 'B', address1: '1 High St', city: 'London', postalCode: 'SW1A 1AA', country: 'GB' };
    await api.db.insert(orders).values({
      id: 'NV-GUESTLINK', checkoutId: crypto.randomUUID(), userId: null, status: 'paid', currency: 'USD', email: user.email, phone: '1',
      marketing: false, shippingAddress: address, billingAddress: address, shippingLabel: 'Standard', shippingEta: '3–5 days',
      deliveryMinDate: '2026-12-01', deliveryMaxDate: '2026-12-03', subtotalCents: 1000, discountCents: 0, shippingCents: 0,
      totalCents: 1000, paymentMethod: 'card',
    });
    await api.db.insert(orderItems).values({ id: 'oi-guestlink', orderId: 'NV-GUESTLINK', slug: 'x', name: 'Item', imageUrl: 'x', unitPriceCents: 1000, quantity: 1 });
    assert.equal((await api.call('GET', '/me/orders', { token })).body.items.length, 0, 'not before confirming');
    await settle();
    await verify(confirmLinkFor(user.email)!);
    const after = await api.call('GET', '/me/orders', { token });
    assert.deepEqual(after.body.items.map((o: { id: string }) => o.id), ['NV-GUESTLINK']);
  });

  it('deleting the account removes its pending links', async () => {
    const { token, user, password } = await api.register();
    await api.call('DELETE', '/me', { token, body: { password } });
    assert.equal((await api.db.select().from(emailVerifications).where(eq(emailVerifications.userId, user.id))).length, 0);
  });
});
