import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { errorHandler } from './lib/errors.ts';
import { createRateLimiter, noRateLimits } from './lib/rateLimit.ts';
import type { Mailer } from './lib/email.ts';
import type { Db } from './db/client.ts';
import type { AppEnv, Deps } from './types.ts';
import { authRoutes } from './modules/accounts/auth.ts';
import { profileRoutes } from './modules/accounts/profile.ts';
import { addressRoutes } from './modules/accounts/addresses.ts';
import { catalogRoutes } from './modules/catalog/routes.ts';
import { engagementRoutes } from './modules/engagement/routes.ts';
import { orderRoutes } from './modules/orders/routes.ts';

const MAX_BODY_BYTES = 100 * 1024;

type Options = {
  db: Db;
  mailer: Mailer;
  appUrl?: string;
  supportEmail?: string;
  rateLimits?: boolean;
  /** How many proxies you run in front of the API. 0 means X-Forwarded-For is ignored. */
  trustProxyHops?: number;
};

/** Builds the API. Everything is under /api, matching the storefront's VITE_API_URL default. */
export function createApp({ db, mailer, appUrl = 'http://localhost:5173', supportEmail = 'support@nova.store', rateLimits = true, trustProxyHops = 0 }: Options) {
  // rateLimits: false is for tests that make many requests from one client.
  const limiter = rateLimits ? createRateLimiter({ trustProxyHops }) : noRateLimits;
  const deps: Deps = { db, mailer, appUrl, supportEmail, rateLimit: limiter.perIp, limiter };

  const api = new Hono<AppEnv>();
  // The largest real request (a support message) is a few KB. Anything far bigger is refused before it's read.
  api.use(
    '*',
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json({ message: 'That request is too large.', code: 'payload_too_large' }, 413),
    }),
  );
  api.get('/health', (c) => c.json({ ok: true }));
  for (const routes of [authRoutes, profileRoutes, addressRoutes, catalogRoutes, engagementRoutes, orderRoutes]) {
    api.route('/', routes(deps));
  }

  const app = new Hono<AppEnv>();
  app.route('/api', api);
  app.notFound((c) => c.json({ message: 'We couldn’t find that.', code: 'not_found' }, 404));
  app.onError(errorHandler);
  return app;
}
