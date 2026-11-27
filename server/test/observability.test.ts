/** Logging, error tracing and health checks (docs/API.md, section 10). */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { createApp } from '../src/app.ts';
import type { Db } from '../src/db/client.ts';
import { createConsoleMailer } from '../src/lib/email.ts';
import { createLogger, redactUrl } from '../src/lib/logger.ts';
import { testApi } from './helpers.ts';

type Line = Record<string, any>;
const lines: Line[] = [];
const captured = createLogger({ level: 'debug', json: true, write: (line) => lines.push(JSON.parse(line)) });
const logged = (msg: string) => lines.filter((line) => line.msg === msg);

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => {
  api = await testApi({ logger: captured });
  // Two routes that fail the way real bugs do: a plain exception, and a database rule being broken.
  api.app.get('/api/test/boom', () => {
    throw new Error('kaboom', { cause: new Error('the underlying reason') });
  });
  api.app.get('/api/test/duplicate', async () => {
    await api.db.execute(sql`INSERT INTO categories (id, slug, name, tagline, image_url, position) VALUES ('electronics', 'x', 'x', 'x', 'x', 9)`);
    return new Response('unreachable');
  });
});
after(() => api.close());

describe('request ids', () => {
  it('gives every response an id, and uses a valid one sent by a proxy', async () => {
    const plain = await api.app.request('/api/categories');
    assert.match(plain.headers.get('x-request-id')!, /^req_[\w-]{12}$/);
    const forwarded = await api.app.request('/api/categories', { headers: { 'X-Request-Id': 'edge-1234abcd' } });
    assert.equal(forwarded.headers.get('x-request-id'), 'edge-1234abcd');
    const junk = await api.app.request('/api/categories', { headers: { 'X-Request-Id': '<script>' } });
    assert.match(junk.headers.get('x-request-id')!, /^req_/, 'arbitrary input is never used as an id');
  });

  it('puts the id in every error body, matching the header', async () => {
    for (const path of ['/api/nope', '/api/products/no-such-product', '/api/me/addresses']) {
      const res = await api.app.request(path);
      const body = await res.json();
      assert.equal(body.requestId, res.headers.get('x-request-id'), path);
    }
  });
});

describe('error tracing', () => {
  it('logs an unexpected error with its request id, route, stack and cause, and gives the shopper a reference', async () => {
    lines.length = 0;
    const res = await api.app.request('/api/test/boom');
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(body.code, 'server_error');
    assert.ok(body.message.includes(body.requestId), 'the message quotes the reference');
    assert.ok(!body.message.includes('kaboom'), 'internal details never reach the shopper');

    const [line] = logged('Unhandled error');
    assert.equal(line!.level, 'error');
    assert.equal(line!.requestId, body.requestId);
    assert.equal(line!.path, '/api/test/boom');
    assert.equal(line!.error.message, 'kaboom');
    assert.match(line!.error.stack, /observability\.test\.ts/);
    assert.equal(line!.error.cause.message, 'the underlying reason');
    const [summary] = logged('Request failed');
    assert.deepEqual([summary!.status, summary!.errorCode, summary!.requestId], [500, 'server_error', body.requestId]);
  });

  it('names the database rule that failed', async () => {
    lines.length = 0;
    await api.app.request('/api/test/duplicate');
    const { error } = logged('Unhandled error')[0]!;
    const reason = error.code === '23505' ? error : error.cause;
    assert.equal(reason.code, '23505', 'PostgreSQL’s unique-violation code');
    assert.equal(reason.constraint, 'categories_pkey');
  });

  it('logs each request once: method, path without the query, status, time and user', async () => {
    const { token, user } = await api.register();
    lines.length = 0;
    await api.call('GET', '/me/addresses', { token });
    await api.app.request('/api/products?q=secret-search&limit=1');
    const [mine, search] = logged('Request');
    assert.deepEqual([mine!.method, mine!.path, mine!.status, mine!.userId], ['GET', '/api/me/addresses', 200, user.id]);
    assert.equal(typeof mine!.durationMs, 'number');
    assert.equal(search!.path, '/api/products', 'query strings are never logged');
    const validation = await api.app.request('/api/products?limit=abc');
    assert.equal(validation.status, 422);
    assert.equal(logged('Request').at(-1)!.errorCode, 'validation_failed');
  });
});

describe('secrets never reach the logs', () => {
  it('redacts password, token and authorization fields, and tokens in URLs', () => {
    const out: string[] = [];
    const log = createLogger({ level: 'debug', json: true, write: (line) => out.push(line) });
    log.info('test', { password: 'Hunter2026', newPassword: 'x', body: { token: 'abc', nested: { Authorization: 'Bearer xyz' } }, email: 'a@b.co' });
    assert.ok(!/Hunter2026|abc|xyz/.test(out[0]!), out[0]);
    assert.match(out[0]!, /"password":"\[redacted\]"/);
    assert.equal(redactUrl('/reset-password?token=abc123&x=1'), '/reset-password?token=[redacted]&x=1');
    assert.equal(redactUrl('/login?redirect=%2Freset-password%3Ftoken%3Dabc123%26x%3D1'), '/login?redirect=%2Freset-password%3Ftoken%3D[redacted]%26x%3D1');
  });

  it('keeps sign-in passwords and tokens out of request logs', async () => {
    lines.length = 0;
    await api.call('POST', '/auth/login', { body: { email: 'demo@example.com', password: 'Nova2026!' } });
    await api.call('POST', '/auth/reset-password', { body: { token: 'some-reset-token', password: 'Hunter2026x' } });
    const all = JSON.stringify(lines);
    assert.ok(!/Nova2026!|Hunter2026x|some-reset-token/.test(all));
  });
});

describe('health checks', () => {
  it('liveness answers without touching the database', async () => {
    const res = await api.app.request('/api/health');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });

  it('readiness checks the database and migrations', async () => {
    const res = await api.app.request('/api/health/ready');
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.checks.database.ok, true);
    assert.equal(typeof body.checks.database.ms, 'number');
    assert.deepEqual(body.checks.migrations, { ok: true });
    assert.equal(body.checks.email.detail, 'console');
  });

  it('answers 503 and logs why when the database is down', async () => {
    const down = new Proxy(api.db, {
      get: (target, key) => (key === 'execute' ? () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:5432')) : Reflect.get(target, key)),
    }) as Db;
    const app = createApp({ db: down, mailer: createConsoleMailer({ quiet: true }), logger: captured });
    lines.length = 0;
    const res = await app.request('/api/health/ready');
    const body = await res.json();
    assert.equal(res.status, 503);
    assert.deepEqual(body.checks.database.ok, false);
    assert.ok(!JSON.stringify(body).includes('10.0.0.5'), 'no internal addresses in the public answer');
    assert.match(logged('Health check: database not reachable')[0]!.error.message, /ECONNREFUSED/, 'but the log has the reason');
  });
});

describe('storefront error reports', () => {
  it('logs a crash report from the browser, linked to the failed request, with tokens removed', async () => {
    lines.length = 0;
    const res = await api.call('POST', '/client-errors', {
      body: {
        kind: 'render',
        message: "Cannot read properties of undefined (reading 'price')",
        stack: 'TypeError: …\n    at ProductCard (ProductCard.jsx:42)',
        componentStack: '\n    at ProductCard\n    at ShopPage',
        url: 'https://shop.example.com/reset-password?token=leaky',
        requestId: 'req_failedcall1',
      },
    });
    assert.equal(res.status, 204);
    const [line] = logged('Storefront error');
    assert.equal(line!.kind, 'render');
    assert.equal(line!.failedRequestId, 'req_failedcall1');
    assert.match(line!.requestId, /^req_/, 'the report has its own id too');
    assert.equal(line!.url, 'https://shop.example.com/reset-password?token=[redacted]');
  });

  it('refuses reports that aren’t reports', async () => {
    assert.equal((await api.call('POST', '/client-errors', { body: { message: '' } })).status, 422);
    assert.equal((await api.call('POST', '/client-errors', { body: { message: 'x'.repeat(2000) } })).status, 422);
  });
});

describe('Content-Security-Policy reports', () => {
  const post = (body: unknown, type: string) =>
    api.app.request('/api/csp-reports', { method: 'POST', headers: { 'Content-Type': type }, body: JSON.stringify(body) });

  it('logs a blocked script from either report format, with tokens removed', async () => {
    lines.length = 0;
    const legacy = await post(
      { 'csp-report': { 'document-uri': 'https://shop.example.com/reset-password?token=secret1', 'blocked-uri': 'https://evil.example/x.js', 'effective-directive': 'script-src-elem' } },
      'application/csp-report',
    );
    const modern = await post(
      [{ type: 'csp-violation', body: { documentURL: 'https://shop.example.com/account', blockedURL: 'inline', effectiveDirective: 'script-src-elem', sample: 'alert(1)' } }],
      'application/reports+json',
    );
    assert.deepEqual([legacy.status, modern.status], [204, 204]);
    const logged = lines.filter((line) => line.msg === 'CSP violation');
    assert.equal(logged.length, 2);
    assert.equal(logged[0]!.level, 'warn');
    assert.equal(logged[0]!.page, 'https://shop.example.com/reset-password?token=[redacted]');
    assert.equal(logged[0]!.blocked, 'https://evil.example/x.js');
    assert.equal(logged[1]!.sample, 'alert(1)');
  });

  it('ignores junk quietly', async () => {
    const res = await api.app.request('/api/csp-reports', { method: 'POST', headers: { 'Content-Type': 'application/csp-report' }, body: 'not json' });
    assert.equal(res.status, 204);
  });
});

describe('the API’s own headers', () => {
  it('allows nothing to load or run from an API response, and no framing', async () => {
    const res = await api.app.request('/api/categories');
    assert.match(res.headers.get('content-security-policy') ?? '', /default-src 'none'.*frame-ancestors 'none'/);
  });
});
