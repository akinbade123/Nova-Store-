import type { Db } from './db/client.ts';
import type { users } from './db/schema.ts';
import type { Mailer } from './lib/email.ts';
import type { RateLimiter } from './lib/rateLimit.ts';
import type { Logger } from './lib/logger.ts';

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
  /** True once the process has been told to stop: readiness then answers 503 so traffic moves away. */
  isShuttingDown: () => boolean;
};

export type UserRow = typeof users.$inferSelect;

/**
 * Values set on the request context: the request's id and logger (requestContext), the signed-in user
 * (requireAuth), and the error code when the request failed (errorHandler, for the summary log line).
 */
export type AppEnv = {
  Variables: { user: UserRow; sessionId: string; requestId: string; log: Logger; errorCode?: string };
};
