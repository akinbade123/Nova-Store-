import type { MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { ApiError } from './errors.ts';

/**
 * Fixed-window rate limiter, kept in memory. Enough for a single server instance.
 * Running several instances? Move the counters to the database or Redis, or the limits multiply.
 */
export function createRateLimiter() {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const clientIp = (c: Parameters<MiddlewareHandler>[0]) => {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) return forwarded;
    try {
      return getConnInfo(c).remote.address ?? 'unknown';
    } catch {
      return 'unknown'; // e.g. in tests, where there's no socket
    }
  };

  return (name: string, limit: number, windowMs: number): MiddlewareHandler =>
    async (c, next) => {
      const now = Date.now();
      const key = `${name}:${clientIp(c)}`;
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      } else if (++entry.count > limit) {
        c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        throw new ApiError(429, 'rate_limited', 'Too many attempts. Please wait a moment and try again.');
      }
      await next();
    };
}
