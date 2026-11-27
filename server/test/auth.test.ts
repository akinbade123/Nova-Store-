import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_ACCOUNT, testApi } from './helpers.ts';

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => (api = await testApi()));
after(() => api.close());

describe('register', () => {
  it('creates an account, returns the public user and a working token', async () => {
    const res = await api.call('POST', '/auth/register', {
      body: { firstName: ' Ada ', lastName: 'Lovelace', email: ' Ada@Example.COM ', password: 'Password2026', marketing: true },
    });
    assert.equal(res.status, 201);
    assert.deepEqual(Object.keys(res.body.user).sort(), ['createdAt', 'email', 'emailVerified', 'firstName', 'id', 'lastName', 'marketing']);
    assert.equal(res.body.user.emailVerified, false, 'a new account starts unconfirmed');
    assert.equal(res.body.user.email, 'ada@example.com', 'email is trimmed and lowercased');
    assert.equal(res.body.user.firstName, 'Ada');
    const me = await api.call('PATCH', '/me', { body: {}, token: res.body.token });
    assert.equal(me.status, 200);
  });

  it('rejects an email that already has an account with email_taken', async () => {
    const res = await api.call('POST', '/auth/register', {
      body: { firstName: 'A', lastName: 'B', email: DEMO_ACCOUNT.email.toUpperCase(), password: 'Password2026' },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'email_taken');
  });

  it('reports each invalid field with the storefront’s messages', async () => {
    const res = await api.call('POST', '/auth/register', { body: { firstName: '', lastName: 'B', email: 'nope', password: 'short' } });
    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'validation_failed');
    assert.equal(res.body.fields.firstName, 'Enter a first name');
    assert.equal(res.body.fields.email, 'Enter a valid email, like name@example.com');
    assert.equal(res.body.fields.password, 'Password needs: at least 8 characters');
  });

  it('rejects a body that isn’t JSON', async () => {
    const res = await api.app.request('/api/auth/register', { method: 'POST', body: '{nope', headers: { 'Content-Type': 'application/json' } });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, 'invalid_json');
  });
});

describe('login and logout', () => {
  it('signs in the demo account', async () => {
    const res = await api.call('POST', '/auth/login', { body: { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password } });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, 'u-demo');
    assert.ok(res.body.token.length > 30);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await api.call('POST', '/auth/login', { body: { email: DEMO_ACCOUNT.email, password: 'Wrong2026' } });
    const unknown = await api.call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'Wrong2026' } });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
    assert.equal(wrong.body.code, 'invalid_credentials');
  });

  it('requires a valid token for /me, with code unauthorized', async () => {
    for (const token of [undefined, 'not-a-real-token']) {
      const res = await api.call('PATCH', '/me', { body: {}, token });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'unauthorized');
    }
  });

  it('revokes the session on logout, and never answers 401 to logout', async () => {
    const token = await api.signIn();
    assert.equal((await api.call('POST', '/auth/logout', { token })).status, 204);
    assert.equal((await api.call('PATCH', '/me', { body: {}, token })).status, 401);
    assert.equal((await api.call('POST', '/auth/logout', { token })).status, 204, 'already revoked: still 204');
    assert.equal((await api.call('POST', '/auth/logout')).status, 204, 'no token: still 204');
  });
});

describe('password reset', () => {
  it('answers the same whether or not the account exists, and only emails real accounts', async () => {
    const before = api.mailer.outbox.length;
    const real = await api.call('POST', '/auth/forgot-password', { body: { email: DEMO_ACCOUNT.email } });
    const fake = await api.call('POST', '/auth/forgot-password', { body: { email: 'nobody@example.com' } });
    assert.equal(real.status, 202);
    assert.deepEqual(real, fake);
    await new Promise((r) => setImmediate(r)); // emails are sent in the background
    const sent = api.mailer.outbox.slice(before);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]!.to, DEMO_ACCOUNT.email);
    assert.match(sent[0]!.text, /https:\/\/nova\.test\/reset-password\?token=[\w-]+/);
  });

  it('resets the password once, signs out every session, and the new password works', async () => {
    const { token: session, user, password } = await api.register();
    await api.call('POST', '/auth/forgot-password', { body: { email: user.email } });
    await new Promise((r) => setImmediate(r));
    const link = api.mailer.outbox.at(-1)!.text.match(/token=([\w-]+)/)![1]!;

    const reset = await api.call('POST', '/auth/reset-password', { body: { token: link, password: 'Brand2026New' } });
    assert.equal(reset.status, 200);
    assert.deepEqual(reset.body, { reset: true });
    assert.equal((await api.call('PATCH', '/me', { body: {}, token: session })).status, 401, 'old session revoked');

    const again = await api.call('POST', '/auth/reset-password', { body: { token: link, password: 'Other2026New' } });
    assert.equal(again.status, 400);
    assert.equal(again.body.code, 'invalid_token');

    assert.equal((await api.call('POST', '/auth/login', { body: { email: user.email, password } })).status, 401);
    assert.equal((await api.call('POST', '/auth/login', { body: { email: user.email, password: 'Brand2026New' } })).status, 200);
  });

  it('rejects an unknown token with invalid_token', async () => {
    const res = await api.call('POST', '/auth/reset-password', { body: { token: 'made-up', password: 'Brand2026New' } });
    assert.equal(res.body.code, 'invalid_token');
  });
});

describe('reset links and security notices', () => {
  const resetLink = () => api.mailer.outbox.filter((m) => m.subject.includes('Reset')).at(-1)!.text.match(/token=([\w-]+)/)![1]!;
  const reset = (token: string, password: string) => api.call('POST', '/auth/reset-password', { body: { token, password } });
  const noticesTo = (email: string, subject: string) => api.mailer.outbox.filter((m) => m.to === email && m.subject.includes(subject));

  it('using one reset link cancels every other one, and tells the owner', async () => {
    const { user } = await api.register();
    const links = [];
    for (let i = 0; i < 3; i += 1) {
      await api.call('POST', '/auth/forgot-password', { body: { email: user.email } });
      links.push(resetLink());
    }
    assert.equal((await reset(links[0]!, 'NewPass2026a')).status, 200);
    for (const other of links.slice(1)) {
      const res = await reset(other, 'Attacker2026');
      assert.equal(res.status, 400, 'an older link must not work after a reset');
      assert.equal(res.body.code, 'invalid_token');
    }
    await new Promise((resolve) => setImmediate(resolve)); // notices are sent in the background
    const [notice] = noticesTo(user.email, 'password was changed');
    assert.ok(notice, 'the owner is told');
    assert.match(notice!.text, /reset using a link/);
    assert.match(notice!.text, /forgot-password/);
    assert.ok(!/token=/.test(notice!.text), 'the notice never contains a usable link');
  });

  it('changing the password cancels links requested before, and tells the owner', async () => {
    const { token, user, password } = await api.register();
    await api.call('POST', '/auth/forgot-password', { body: { email: user.email } });
    const pending = resetLink();
    const res = await api.call('POST', '/me/password', { token, body: { currentPassword: password, newPassword: 'Changed2026x' } });
    assert.equal(res.status, 200);
    assert.equal((await reset(pending, 'Attacker2026')).status, 400);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(noticesTo(user.email, 'password was changed').length, 1);
  });

  it('changing the email cancels links sent to the old address, and tells the old address', async () => {
    const { token, user, password } = await api.register();
    await api.call('POST', '/auth/forgot-password', { body: { email: user.email } });
    const pending = resetLink();
    const res = await api.call('PATCH', '/me', { token, body: { email: 'brand-new@example.com', currentPassword: password } });
    assert.equal(res.status, 200);
    assert.equal((await reset(pending, 'Attacker2026')).status, 400);
    await new Promise((resolve) => setImmediate(resolve));
    const [notice] = noticesTo(user.email, 'email address was changed');
    assert.ok(notice, 'the OLD address is told');
    assert.match(notice!.text, /b\*+@example\.com/, 'the new address is shown masked');
    assert.ok(!notice!.text.includes('brand-new@example.com'));
  });

  it('sends nothing when only the name changes', async () => {
    const { token, user } = await api.register();
    const before = api.mailer.outbox.length;
    await api.call('PATCH', '/me', { token, body: { firstName: 'Renamed', email: user.email } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(api.mailer.outbox.length, before);
  });
});

describe('rate limiting', () => {
  it('answers 429 rate_limited after 10 logins in a minute', async () => {
    const fresh = await testApi({ rateLimits: true });
    try {
      let last;
      for (let i = 0; i < 11; i += 1) {
        last = await fresh.call('POST', '/auth/login', { body: { email: 'x@example.com', password: 'Wrong2026' } });
      }
      assert.equal(last!.status, 429);
      assert.equal(last!.body.code, 'rate_limited');
    } finally {
      await fresh.close();
    }
  });

  const wrongLogin = (app: Awaited<ReturnType<typeof testApi>>, email: string, forwardedFor?: string) =>
    app.call('POST', '/auth/login', {
      body: { email, password: 'Wrong2026' },
      headers: forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {},
    });

  it('ignores X-Forwarded-For unless a proxy is configured, so a fake one can’t dodge the limit', async () => {
    const fresh = await testApi({ rateLimits: true });
    try {
      const statuses = [];
      for (let i = 0; i < 11; i += 1) statuses.push((await wrongLogin(fresh, `x${i}@example.com`, `10.0.${i}.1`)).status);
      assert.equal(statuses.at(-1), 429);
    } finally {
      await fresh.close();
    }
  });

  it('behind a proxy, uses the address the proxy saw, not what the client wrote', async () => {
    const fresh = await testApi({ rateLimits: true, trustProxyHops: 1 });
    try {
      // The client prepends a different fake address each time; the proxy appends the real one (203.0.113.7).
      const statuses = [];
      for (let i = 0; i < 11; i += 1) statuses.push((await wrongLogin(fresh, `y${i}@example.com`, `10.0.${i}.1, 203.0.113.7`)).status);
      assert.equal(statuses.at(-1), 429);
      // A genuinely different client is unaffected.
      assert.equal((await wrongLogin(fresh, 'z@example.com', '198.51.100.9')).status, 401);
    } finally {
      await fresh.close();
    }
  });

  it('limits failed sign-ins per account, even when they come from many addresses', async () => {
    const fresh = await testApi({ rateLimits: true, trustProxyHops: 1 });
    try {
      for (let i = 0; i < 10; i += 1) assert.equal((await wrongLogin(fresh, DEMO_ACCOUNT.email, `198.51.100.${i}`)).status, 401);
      // Even the right password is refused for now, so guessing can't continue from a new address.
      const blocked = await fresh.call('POST', '/auth/login', {
        body: DEMO_ACCOUNT,
        headers: { 'X-Forwarded-For': '198.51.100.200' },
      });
      assert.equal(blocked.status, 429);
      assert.match(blocked.body.message, /reset your password/);
      // Other accounts can still sign in.
      const other = await fresh.call('POST', '/auth/register', {
        body: { firstName: 'O', lastName: 'K', email: 'other@example.com', password: 'Password2026' },
        headers: { 'X-Forwarded-For': '198.51.100.201' },
      });
      assert.equal(other.status, 201);
    } finally {
      await fresh.close();
    }
  });
});
