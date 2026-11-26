import type { Context, MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { ApiError } from './errors.ts';

export const tooManyAttempts = (message = 'Too many attempts. Please wait a moment and try again.') =>
  new ApiError(429, 'rate_limited', message);

export type RateLimiter = {
  /** Middleware: at most `limit` requests per client IP per window for the route named `name`. */
  perIp: (name: string, limit: number, windowMs: number) => MiddlewareHandler;
  /** How many times `key` has been recorded in its current window. */
  count: (key: string) => number;
  /** Records one hit for `key`, starting a window of `windowMs` if none is open. */
  hit: (key: string, windowMs: number) => void;
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
 * Fixed-window counters, kept in memory. Enough for a single server instance.
 * Running several instances? Move the counters to the database or Redis, or the limits multiply.
 */
export function createRateLimiter({ trustProxyHops = 0 } = {}): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();

  const current = (key: string, now = Date.now()) => {
    const entry = windows.get(key);
    return entry && entry.resetAt > now ? entry : null;
  };

  const hit = (key: string, windowMs: number) => {
    const now = Date.now();
    const entry = current(key, now);
    if (entry) {
      entry.count += 1;
      return entry;
    }
    const fresh = { count: 1, resetAt: now + windowMs };
    windows.set(key, fresh);
    if (windows.size > 10_000) for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    return fresh;
  };

  return {
    perIp: (name, limit, windowMs) => async (c, next) => {
      const entry = hit(`${name}:${clientIp(c, trustProxyHops)}`, windowMs);
      if (entry.count > limit) {
        c.header('Retry-After', String(Math.ceil((entry.resetAt - Date.now()) / 1000)));
        throw tooManyAttempts();
      }
      await next();
    },
    count: (key) => current(key)?.count ?? 0,
    hit: (key, windowMs) => void hit(key, windowMs),
  };
}

/** Used when rate limits are off (tests that make many requests from one client). */
export const noRateLimits: RateLimiter = {
  perIp: () => async (_c, next) => next(),
  count: () => 0,
  hit: () => {},
};
