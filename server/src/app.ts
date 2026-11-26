import { Hono } from 'hono';
import { errorHandler } from './lib/errors.ts';
import { createRateLimiter } from './lib/rateLimit.ts';
import type { Mailer } from './lib/email.ts';
import type { Db } from './db/client.ts';
import type { AppEnv, Deps } from './types.ts';
import { authRoutes } from './modules/accounts/auth.ts';
import { profileRoutes } from './modules/accounts/profile.ts';
import { addressRoutes } from './modules/accounts/addresses.ts';
import { catalogRoutes } from './modules/catalog/routes.ts';
import { engagementRoutes } from './modules/engagement/routes.ts';
import { orderRoutes } from './modules/orders/routes.ts';

type Options = { db: Db; mailer: Mailer; appUrl?: string; supportEmail?: string; rateLimits?: boolean };

const noLimit: Deps['rateLimit'] = () => async (_c, next) => next();

/** Builds the API. Everything is under /api, matching the storefront's VITE_API_URL default. */
export function createApp({ db, mailer, appUrl = 'http://localhost:5173', supportEmail = 'support@nova.store', rateLimits = true }: Options) {
  // rateLimits: false is for tests that make many requests from one client.
  const deps: Deps = { db, mailer, appUrl, supportEmail, rateLimit: rateLimits ? createRateLimiter() : noLimit };

  const api = new Hono<AppEnv>();
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
