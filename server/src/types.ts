import type { Db } from './db/client.ts';
import type { users } from './db/schema.ts';
import type { Mailer } from './lib/email.ts';

/** What every route module is built from. Passed in, so tests can use their own database and mailer. */
export type Deps = {
  db: Db;
  mailer: Mailer;
  appUrl: string;
  supportEmail: string;
  rateLimit: (name: string, limit: number, windowMs: number) => import('hono').MiddlewareHandler;
};

export type UserRow = typeof users.$inferSelect;

/** Values set on the request context by the auth middleware. */
export type AppEnv = { Variables: { user: UserRow; sessionId: string } };
