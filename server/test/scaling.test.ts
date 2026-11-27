/** Running more than one API instance: shared rate limits, and search that can use an index. */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { createApp } from '../src/app.ts';
import { purgeExpired } from '../src/db/purge.ts';
import { rateLimits } from '../src/db/schema.ts';
import { createConsoleMailer } from '../src/lib/email.ts';
import { createRateLimiter } from '../src/lib/rateLimit.ts';
import { testApi } from './helpers.ts';

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => (api = await testApi({ rateLimits: true })));
after(() => api.close());

const login = (app: { request: typeof api.app.request }) =>
  app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password' }),
  });

describe('rate limits shared by every instance', () => {
  it('counts requests to two instances against one limit', async () => {
    // Two app instances on the same database, as behind a load balancer.
    const second = createApp({ db: api.db, mailer: createConsoleMailer({ quiet: true }) });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await login(api.app)).status, (await login(second)).status);
    assert.equal(statuses.filter((status) => status === 401).length, 10, 'the login limit is 10 a minute in total');
    assert.deepEqual(statuses.slice(10), [429, 429]);
    const blocked = await login(second);
    const retryAfter = Number(blocked.headers.get('retry-after'));
    assert.ok(retryAfter >= 1 && retryAfter <= 60, `Retry-After ${retryAfter}`);
  });

  it('starts a new window once the old one has ended, and purges ended windows', async () => {
    const limiter = createRateLimiter({ db: api.db });
    await limiter.take('test:window', 60_000);
    await limiter.take('test:window', 60_000);
    assert.equal((await limiter.status('test:window')).count, 2);
    await api.db.execute(sql`UPDATE rate_limits SET reset_at = now() - interval '1 second' WHERE key = 'test:window'`);
    assert.equal((await limiter.status('test:window')).count, 0, 'an ended window no longer counts');
    await limiter.take('test:window', 60_000);
    assert.equal((await limiter.status('test:window')).count, 1, 'and the next hit starts again at 1');

    await api.db.execute(sql`UPDATE rate_limits SET reset_at = now() - interval '1 second' WHERE key = 'test:window'`);
    const removed = await purgeExpired(api.db);
    assert.ok(removed.rateLimits >= 1);
    const left = await api.db.select().from(rateLimits).where(sql`key = 'test:window'`);
    assert.equal(left.length, 0);
  });
});

describe('search', () => {
  it('can use the trigram index for “contains” searches', async () => {
    // With 27 products PostgreSQL rightly prefers reading the whole table, so forbid that to check
    // the index matches the expression the search uses (if it didn't, this would still scan).
    const plan = await api.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL enable_seqscan = off`);
      const result = (await tx.execute(
        sql`EXPLAIN SELECT id FROM products WHERE published AND (name || ' ' || category_id || ' ' || description) ILIKE '%leather%'`,
      )) as unknown as { rows: Record<string, string>[] };
      return result.rows.map((row) => Object.values(row)[0]).join('\n');
    });
    assert.match(plan, /products_search_idx/, plan);
    const res = await api.call('GET', '/products?q=leather&facets=false');
    assert.ok(res.body.items.some((product: { slug: string }) => product.slug === 'moto-leather-jacket'));
  });
});
