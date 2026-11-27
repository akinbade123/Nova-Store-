import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { errorHandler } from './lib/errors.ts';
import { type Logger, logger as rootLogger } from './lib/logger.ts';
import { requestContext } from './lib/requestContext.ts';
import { systemRoutes } from './modules/system/routes.ts';
import { createRateLimiter, noRateLimits } from './lib/rateLimit.ts';
import type { Mailer } from './lib/email.ts';
import type { Db } from './db/client.ts';
import type { AppEnv, Deps } from './types.ts';
import { authRoutes } from './modules/accounts/auth.ts';
import { profileRoutes } from './modules/accounts/profile.ts';
import { addressRoutes } from './modules/accounts/addresses.ts';
import { verificationRoutes } from './modules/accounts/verification.ts';
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
  /** Where request and error logs go. Tests pass their own to read what was logged. */
  logger?: Logger;
};

/** Builds the API. Everything is under /api, matching the storefront's VITE_API_URL default. */
export function createApp({ db, mailer, appUrl = 'http://localhost:5173', supportEmail = 'support@nova.store', rateLimits = true, trustProxyHops = 0, logger = rootLogger }: Options) {
  // rateLimits: false is for tests that make many requests from one client.
  const limiter = rateLimits ? createRateLimiter({ trustProxyHops }) : noRateLimits;
  const deps: Deps = { db, mailer, appUrl, supportEmail, rateLimit: limiter.perIp, limiter };

  const api = new Hono<AppEnv>();
  // Standard protective headers on every API response (nosniff, no framing, HSTS, no referrer…).
  api.use('*', secureHeaders());
  // The largest real request (a support message) is a few KB. Anything far bigger is refused before it's read.
  api.use(
    '*',
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => {
        c.set('errorCode', 'payload_too_large');
        return c.json({ message: 'That request is too large.', code: 'payload_too_large', requestId: c.get('requestId') }, 413);
      },
    }),
  );
  for (const routes of [systemRoutes, authRoutes, verificationRoutes, profileRoutes, addressRoutes, catalogRoutes, engagementRoutes, orderRoutes]) {
    api.route('/', routes(deps));
  }

  const app = new Hono<AppEnv>();
  // First, so every request (including 404s and errors) gets an id, a logger and a summary log line.
  app.use('*', requestContext(logger));
  app.route('/api', api);
  app.notFound((c) => {
    c.set('errorCode', 'not_found');
    return c.json({ message: 'We couldn’t find that.', code: 'not_found', requestId: c.get('requestId') }, 404);
  });
  app.onError(errorHandler);
  return app;
}
