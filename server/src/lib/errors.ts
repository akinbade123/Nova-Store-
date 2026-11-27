import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { logger as rootLogger, serializeError } from './logger.ts';

/**
 * An error the API reports to the client as `{ message, code, requestId, ...extra }` (docs/API.md, section 2).
 * `message` is shown to shoppers as-is, so write it for them.
 */
export class ApiError extends Error {
  status: ContentfulStatusCode;
  code: string;
  extra: Record<string, unknown> | undefined;

  constructor(status: ContentfulStatusCode, code: string, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const notFound = (message = 'We couldn’t find that.') => new ApiError(404, 'not_found', message);

/** 401 means only "no valid session": the storefront signs the user out when it gets one. */
export const unauthorized = () => new ApiError(401, 'unauthorized', 'Please sign in to continue.');

/**
 * Turns any thrown error into the API's error response.
 *
 * - ApiError: an expected answer (validation, not found…). Not logged here; the request summary line
 *   records its code.
 * - Anything else is a bug or an outage: logged as an error with the request id, route, user, the
 *   database rule that failed (if any), the stack and its causes. The shopper sees a plain message with
 *   the same request id as a reference, so a support message can be matched to the exact log line.
 */
export function errorHandler(err: Error, c: Context) {
  const requestId: string | undefined = c.get('requestId');
  if (err instanceof ApiError) {
    c.set('errorCode', err.code);
    return c.json({ message: err.message, code: err.code, requestId, ...err.extra }, err.status);
  }
  c.set('errorCode', 'server_error');
  const log = c.get('log') ?? rootLogger;
  log.error('Unhandled error', {
    method: c.req.method,
    path: c.req.path,
    route: c.req.routePath,
    userId: c.get('user')?.id,
    error: serializeError(err),
  });
  const reference = requestId ? ` If it keeps happening, contact us and quote reference ${requestId}.` : '';
  return c.json({ message: `Something went wrong on our side. Please try again.${reference}`, code: 'server_error', requestId }, 500);
}
