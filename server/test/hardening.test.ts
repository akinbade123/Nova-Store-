import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { emailVerifications, passwordResets, sessions, users } from '../src/db/schema.ts';
import { purgeExpired } from '../src/db/purge.ts';
import { hashPassword, needsRehash, sha256 } from '../src/lib/crypto.ts';
import { testApi } from './helpers.ts';

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => (api = await testApi()));
after(() => api.close());
const DAY = 24 * 60 * 60 * 1000;

describe('password hashing', () => {
  it('hashes with OWASP’s N=2^15, r=8, p=3 setting', async () => {
    const hash = await hashPassword('Password2026');
    assert.match(hash, /^scrypt\$32768\$8\$3\$/);
    assert.equal(needsRehash(hash), false);
  });

  it('upgrades a hash made with the old setting at the next sign-in, and the password keeps working', async () => {
    const { user, password } = await api.register();
    // A hash as the previous version made it: N=2^15, r=8, p=1.
    const salt = randomBytes(16);
    const key = scryptSync(password, salt, 64, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const oldHash = `scrypt$32768$8$1$${salt.toString('base64url')}$${key.toString('base64url')}`;
    await api.asOwner((db) => db.update(users).set({ passwordHash: oldHash }).where(eq(users.id, user.id)));
    assert.equal(needsRehash(oldHash), true);

    assert.equal((await api.call('POST', '/auth/login', { body: { email: user.email, password } })).status, 200);
    const [row] = await api.db.select().from(users).where(eq(users.id, user.id));
    assert.match(row!.passwordHash, /^scrypt\$32768\$8\$3\$/, 'upgraded');
    assert.equal((await api.call('POST', '/auth/login', { body: { email: user.email, password } })).status, 200, 'still works');
  });
});

describe('session lifetime', () => {
  it('ends a session 90 days after sign-in, however recently it was used', async () => {
    const { token } = await api.register();
    await api.db
      .update(sessions)
      .set({ createdAt: new Date(Date.now() - 91 * DAY), lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 20 * DAY) })
      .where(eq(sessions.tokenHash, sha256(token)));
    assert.equal((await api.call('GET', '/me', { token })).status, 401);
  });

  it('slides the expiry forward with use, but never past the 90-day cap', async () => {
    const { token } = await api.register();
    const createdAt = new Date(Date.now() - 80 * DAY);
    await api.db
      .update(sessions)
      .set({ createdAt, lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), expiresAt: new Date(Date.now() + DAY) })
      .where(eq(sessions.tokenHash, sha256(token)));
    assert.equal((await api.call('GET', '/me', { token })).status, 200);
    const [row] = await api.db.select().from(sessions).where(eq(sessions.tokenHash, sha256(token)));
    assert.equal(row!.expiresAt.getTime(), createdAt.getTime() + 90 * DAY, 'capped at sign-in + 90 days, not now + 30');
  });
});

describe('purging expired records', () => {
  it('removes ended sessions and spent or expired links, and keeps everything live', async () => {
    const live = await api.register();
    const ended = await api.register();
    await api.call('POST', '/auth/logout', { token: ended.token }); // revoked
    const old = await api.register();
    await api.db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.tokenHash, sha256(old.token)));
    await api.db.insert(passwordResets).values([
      { tokenHash: 'used-reset', userId: live.user.id, expiresAt: new Date(Date.now() + DAY), usedAt: new Date() },
      { tokenHash: 'expired-reset', userId: live.user.id, expiresAt: new Date(Date.now() - 1000) },
      { tokenHash: 'live-reset', userId: live.user.id, expiresAt: new Date(Date.now() + DAY) },
    ]);
    await api.db.update(emailVerifications).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(emailVerifications.userId, old.user.id));

    const removed = await purgeExpired(api.db);
    assert.ok(removed.sessions >= 2 && removed.passwordResets >= 2 && removed.emailVerifications >= 1, JSON.stringify(removed));
    assert.equal((await api.call('GET', '/me', { token: live.token })).status, 200, 'live session untouched');
    assert.equal((await api.db.select().from(passwordResets).where(eq(passwordResets.tokenHash, 'live-reset'))).length, 1);
    assert.equal((await api.db.select().from(emailVerifications).where(eq(emailVerifications.userId, live.user.id))).length, 1);
  });
});
