import { randomBytes } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { matchedRoutes } from 'hono/route';
import type { AppEnv } from '../types.ts';
import type { Logger } from './logger.ts';
import type { UsageMeter } from './usage.ts';

/** Requests slower than this are logged as warnings. */
export const SLOW_REQUEST_MS = 1000;

/** Accept an id from a proxy (or the storefront) only if it looks like one; never log arbitrary input as an id. */
const VALID_ID = /^[\w.-]{8,64}$/;
export const newRequestId = () => `req_${randomBytes(9).toString('base64url')}`;

/**
 * Gives every request an id and a logger, and writes one summary line when it finishes:
 * method, path, status, duration, the signed-in user and the error code if there was one.
 * The id is returned in the X-Request-Id header and in error bodies, so a shopper's "reference"
 * or a failed request in the browser's network tab leads straight to the server's log lines.
 */
export function requestContext(baseLogger: Logger, usage?: UsageMeter): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const incoming = c.req.header('x-request-id');
    const requestId = incoming && VALID_ID.test(incoming) ? incoming : newRequestId();
    const log = baseLogger.child({ requestId });
    c.set('requestId', requestId);
    c.set('log', log);
    c.header('X-Request-Id', requestId);
    const started = performance.now();

    await next();

    const durationMs = Math.round(performance.now() - started);
    const status = c.res.status;
    // The route's pattern (/api/products/:slug), not its path, so ids don't split the counts.
    usage?.request(matchedRoutes(c).filter((route) => route.method !== 'ALL').at(-1)?.path ?? 'unmatched', status, durationMs);
    const fields = {
      method: c.req.method,
      path: c.req.path, // never the query string: reset and confirmation tokens can travel there
      status,
      durationMs,
      userId: c.get('user')?.id,
      errorCode: c.get('errorCode'),
    };
    if (status >= 500) log.warn('Request failed', fields);
    else if (durationMs >= SLOW_REQUEST_MS) log.warn('Slow request', fields);
    else if (c.req.path.startsWith('/api/health')) log.debug('Request', fields); // probes run every few seconds
    else log.info('Request', fields);
  };
}
