import type { Context, MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { ApiError } from './errors.ts';

export const tooManyAttempts = (message = 'Too many attempts. Please wait a moment and try again.') =>
  new ApiError(429, 'rate_limited', message);

export type RateLimiter = {
  /** Middleware: at most `limit` requests per client IP per window for the route named `name`. */
  perIp: (name: string, limit: number, windowMs: number) => MiddlewareHandler;
  /** How many times `key` has been recorded in its current window. */
  count: (key: string) => Promise<number>;
  /** Records one hit for `key`, starting a window of `windowMs` if none is open. */
  hit: (key: string, windowMs: number) => Promise<void>;
};

/**
 * The client's IP address. `X-Forwarded-For` can be sent by anyone, so it's only used when
 * `trustProxyHops` says how many proxies (yours, e.g. Vercel or a load balancer) sit in front of the API.
 * Each proxy appends the address it received the request from, so the client is `trustProxyHops`
 * entries from the right; anything further left was written by the client and is ignored.
 */
export function clientIp(c: Context, trustProxyHops = 0) {
  if (trustProxyHops > 0) {
    const chain = (c.req.header('x-forwarded-for') ?? '').split(',').map((part) => part.trim()).filter(Boolean);
    const ip = chain[chain.length - trustProxyHops] ?? chain[0];
    if (ip) return ip;
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown'; // e.g. in tests, where there's no socket
  }
}

/**
 * Fixed-window counters in the rate_limits table, so every API instance counts against the same
 * limit (counters in memory would give each instance its own allowance). One statement per hit:
 * the upsert starts a new window when the old one has ended, and returns the count so far.
 * Expired rows are deleted by purgeExpired (src/db/purge.ts).
 */
export function createRateLimiter({ db, trustProxyHops = 0 }: { db: Db; trustProxyHops?: number }): RateLimiter {
  const hit = async (key: string, windowMs: number) => {
    const result = (await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= now() THEN excluded.reset_at ELSE rate_limits.reset_at END
      RETURNING count, reset_at
    `)) as unknown as { rows: { count: number; reset_at: Date | string }[] };
    const row = result.rows[0]!;
    return { count: row.count, resetAt: new Date(row.reset_at).getTime() };
  };

  return {
    perIp: (name, limit, windowMs) => async (c, next) => {
      const entry = await hit(`${name}:${clientIp(c, trustProxyHops)}`, windowMs);
      if (entry.count > limit) {
        c.header('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000))));
        throw tooManyAttempts();
      }
      await next();
    },
    count: async (key) => {
      const result = (await db.execute(
        sql`SELECT count FROM rate_limits WHERE key = ${key} AND reset_at > now()`,
      )) as unknown as { rows: { count: number }[] };
      return result.rows[0]?.count ?? 0;
    },
    hit: async (key, windowMs) => {
      await hit(key, windowMs);
    },
  };
}

/** Used when rate limits are off (tests that make many requests from one client). */
export const noRateLimits: RateLimiter = {
  perIp: () => async (_c, next) => next(),
  count: async () => 0,
  hit: async () => {},
};
