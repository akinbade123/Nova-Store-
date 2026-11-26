import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { users } from '../src/db/schema.ts';
import { DEMO_ACCOUNT, testApi } from './helpers.ts';

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => (api = await testApi()));
after(() => api.close());

const address = (overrides = {}) => ({
  label: 'Home',
  firstName: 'Ada',
  lastName: 'Okafor',
  address1: '14 Admiralty Way',
  address2: '',
  city: 'Lekki',
  region: 'Lagos',
  postalCode: '106104',
  country: 'NG',
  phone: '+234 803 555 0142',
  isDefault: false,
  ...overrides,
});
const defaults = (list: { isDefault: boolean }[]) => list.filter((item) => item.isDefault).length;

describe('profile', () => {
  it('updates any subset of fields and returns the user', async () => {
    const { token } = await api.register();
    const res = await api.call('PATCH', '/me', { body: { firstName: 'Grace', marketing: true }, token });
    assert.equal(res.status, 200);
    assert.equal(res.body.firstName, 'Grace');
    assert.equal(res.body.marketing, true);
    assert.equal(res.body.lastName, 'User', 'untouched fields stay');
  });

  it('refuses an email another account uses', async () => {
    const { token, password } = await api.register();
    const res = await api.call('PATCH', '/me', { body: { email: DEMO_ACCOUNT.email, currentPassword: password }, token });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'email_taken');
  });

  it('needs the current password to change the email, checked before whether the email is taken', async () => {
    const { token, user, password } = await api.register();
    const missing = await api.call('PATCH', '/me', { body: { email: 'new@example.com' }, token });
    assert.equal(missing.status, 422);
    assert.ok(missing.body.fields.currentPassword);
    // A wrong password gets the same answer for a free email and a taken one, so it reveals nothing.
    for (const email of ['new@example.com', DEMO_ACCOUNT.email]) {
      const wrong = await api.call('PATCH', '/me', { body: { email, currentPassword: 'Nope2026x' }, token });
      assert.equal(wrong.status, 400);
      assert.equal(wrong.body.code, 'wrong_password');
    }
    assert.equal((await api.call('GET', '/me/addresses', { token })).status, 200, 'a wrong password never signs the user out');
    const ok = await api.call('PATCH', '/me', { body: { email: 'new@example.com', currentPassword: password }, token });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.email, 'new@example.com');
    assert.equal(ok.body.currentPassword, undefined);
    // Sending your own unchanged email, as the settings form does, needs no password.
    const same = await api.call('PATCH', '/me', { body: { firstName: 'Ada', email: 'new@example.com' }, token });
    assert.equal(same.status, 200);
    assert.notEqual(user.email, 'new@example.com');
  });

  it('changes the password: wrong current password is rejected, other sessions are signed out, this one stays', async () => {
    const { token: here, user, password } = await api.register();
    const elsewhere = await api.signIn(user.email, password);

    const wrong = await api.call('POST', '/me/password', { body: { currentPassword: 'Nope2026x', newPassword: 'Fresh2026Pass' }, token: here });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.code, 'wrong_password');

    const ok = await api.call('POST', '/me/password', { body: { currentPassword: password, newPassword: 'Fresh2026Pass' }, token: here });
    assert.deepEqual(ok.body, { changed: true });
    assert.equal((await api.call('PATCH', '/me', { body: {}, token: here })).status, 200);
    assert.equal((await api.call('PATCH', '/me', { body: {}, token: elsewhere })).status, 401);
  });

  it('needs the password to delete the account', async () => {
    const { token } = await api.register();
    const missing = await api.call('DELETE', '/me', { token });
    assert.equal(missing.status, 400, 'no body at all is invalid JSON');
    const empty = await api.call('DELETE', '/me', { body: {}, token });
    assert.equal(empty.status, 422);
    assert.ok(empty.body.fields.password);
    const wrong = await api.call('DELETE', '/me', { body: { password: 'Nope2026x' }, token });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.code, 'wrong_password');
    assert.equal((await api.call('GET', '/me/addresses', { token })).status, 200, 'the account is still there');
  });

  it('deletes the account: signs out, removes addresses, frees the email, anonymises the row', async () => {
    const { token, user, password } = await api.register();
    await api.call('POST', '/me/addresses', { body: address(), token });
    const res = await api.call('DELETE', '/me', { body: { password }, token });
    assert.deepEqual(res.body, { deleted: true });
    assert.equal((await api.call('GET', '/me/addresses', { token })).status, 401);
    assert.equal((await api.call('POST', '/auth/login', { body: { email: user.email, password } })).status, 401);
    const [row] = await api.db.select().from(users).where(eq(users.id, user.id));
    assert.ok(row!.deletedAt);
    assert.notEqual(row!.email, user.email);
    assert.equal((await api.call('POST', '/auth/register', { body: { firstName: 'A', lastName: 'B', email: user.email, password } })).status, 201);
  });
});

describe('addresses', () => {
  it('requires sign-in', async () => {
    assert.equal((await api.call('GET', '/me/addresses')).status, 401);
  });

  it('makes the first address the default and returns the whole list on every change', async () => {
    const { token } = await api.register();
    const first = await api.call('POST', '/me/addresses', { body: address({ label: 'Home' }), token });
    assert.equal(first.status, 201);
    assert.equal(first.body.length, 1);
    assert.equal(first.body[0].isDefault, true, 'first address becomes the default');

    const second = await api.call('POST', '/me/addresses', { body: address({ label: 'Work' }), token });
    assert.equal(second.body.length, 2);
    assert.equal(second.body[1].isDefault, false);

    const third = await api.call('POST', '/me/addresses', { body: address({ label: 'Other', isDefault: true }), token });
    assert.equal(third.body.find((a: any) => a.isDefault).label, 'Other');
    assert.equal(defaults(third.body), 1);
  });

  it('keeps exactly one default through updates, set-default and deletes', async () => {
    const { token } = await api.register();
    await api.call('POST', '/me/addresses', { body: address({ label: 'Home' }), token });
    let list = (await api.call('POST', '/me/addresses', { body: address({ label: 'Work' }), token })).body;
    const [home, work] = list;

    list = (await api.call('POST', `/me/addresses/${work.id}/default`, { token })).body;
    assert.equal(list.find((a: any) => a.isDefault).id, work.id);

    list = (await api.call('PUT', `/me/addresses/${work.id}`, { body: address({ label: 'Office', isDefault: true }), token })).body;
    assert.equal(list.find((a: any) => a.id === work.id).label, 'Office');
    assert.equal(defaults(list), 1);

    list = (await api.call('DELETE', `/me/addresses/${work.id}`, { token })).body;
    assert.equal(list.length, 1);
    assert.equal(list[0].id, home.id);
    assert.equal(list[0].isDefault, true, 'deleting the default promotes the remaining address');

    list = (await api.call('DELETE', `/me/addresses/${home.id}`, { token })).body;
    assert.deepEqual(list, []);
  });

  it('uses the storefront’s address rules, per country', async () => {
    const { token } = await api.register();
    const us = await api.call('POST', '/me/addresses', { body: address({ country: 'US', region: '', postalCode: '1234' }), token });
    assert.equal(us.status, 422);
    assert.equal(us.body.fields.region, 'Enter a state');
    assert.equal(us.body.fields.postalCode, 'Enter a valid ZIP code');

    const ng = await api.call('POST', '/me/addresses', { body: address({ country: 'NG', postalCode: '' }), token });
    assert.equal(ng.status, 201, 'postal code is optional in Nigeria');

    const phone = await api.call('POST', '/me/addresses', { body: address({ phone: '' }), token });
    assert.equal(phone.body.fields.phone, 'Enter a phone number for delivery updates');

    const country = await api.call('POST', '/me/addresses', { body: address({ country: 'ZZ' }), token });
    assert.equal(country.body.fields.country, 'Choose a country we deliver to');
  });

  it('hides other people’s addresses as not_found', async () => {
    const owner = await api.register();
    const [mine] = (await api.call('POST', '/me/addresses', { body: address(), token: owner.token })).body;
    const other = await api.register();
    for (const [method, path] of [
      ['PUT', `/me/addresses/${mine.id}`],
      ['DELETE', `/me/addresses/${mine.id}`],
      ['POST', `/me/addresses/${mine.id}/default`],
    ] as const) {
      const res = await api.call(method, path, { body: method === 'PUT' ? address() : undefined, token: other.token });
      assert.equal(res.status, 404, `${method} ${path}`);
      assert.equal(res.body.code, 'not_found');
    }
    assert.equal((await api.call('GET', '/me/addresses', { token: owner.token })).body.length, 1, 'still there');
  });
});
