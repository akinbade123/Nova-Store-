import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * An error the API reports to the client as `{ message, code, ...extra }` (docs/API.md, section 2).
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

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ApiError) {
    return c.json({ message: err.message, code: err.code, ...err.extra }, err.status);
  }
  console.error(err);
  return c.json({ message: 'Something went wrong on our side. Please try again.', code: 'server_error' }, 500);
}
