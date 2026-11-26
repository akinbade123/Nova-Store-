import type { Db } from './db/client.ts';
import type { users } from './db/schema.ts';
import type { Mailer } from './lib/email.ts';
import type { RateLimiter } from './lib/rateLimit.ts';

/** What every route module is built from. Passed in, so tests can use their own database and mailer. */
export type Deps = {
  db: Db;
  mailer: Mailer;
  appUrl: string;
  supportEmail: string;
  /** Per-IP limit middleware for a route. Same as `limiter.perIp`. */
  rateLimit: RateLimiter['perIp'];
  /** Counters for limits that aren't per IP, such as failed logins per email. */
  limiter: RateLimiter;
};

export type UserRow = typeof users.$inferSelect;

/** Values set on the request context by the auth middleware. */
export type AppEnv = { Variables: { user: UserRow; sessionId: string } };
