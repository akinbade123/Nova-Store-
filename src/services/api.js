import axios from 'axios';
import { reportError } from './errorReporter';

export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

/** Shared HTTP client. Every service module talks to the backend through this instance. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nova:token') ?? sessionStorage.getItem('nova:token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Fired on `window` when the API rejects the stored session. AuthProvider listens for it. */
export const SESSION_EXPIRED_EVENT = 'nova:session-expired';

/*
 * Error contract: the API responds with { message, code }. `userMessage` is safe to show;
 * `code` (e.g. 'email_taken') lets callers handle specific cases, the same as in sample-data mode.
 * After a 429, `retryAfter` is the number of seconds to wait (see useCooldown).
 */
/** Reads (GET) refused with 429 are retried once by themselves when the wait is this short or less. */
const AUTO_RETRY_MAX_SECONDS = 5;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const body = error.response?.data;
    // 429: the API says how long to wait, in the body and the Retry-After header. A read is safe to
    // repeat, so a short wait is retried once without bothering the shopper. Anything else (sign-in,
    // forms) is never retried automatically: repeating it would just use up the limit again.
    const retryAfter = error.response?.status === 429 ? Number(body?.retryAfter ?? error.response.headers?.['retry-after']) || undefined : undefined;
    const config = error.config;
    if (retryAfter && retryAfter <= AUTO_RETRY_MAX_SECONDS && config && config.method === 'get' && !config.retriedAfter429) {
      await wait(retryAfter * 1000);
      return api.request({ ...config, retriedAfter429: true });
    }
    const message =
      body?.message ??
      (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Something went wrong. Please try again.');
    // A 401 on a request that carried a token means the session expired or was revoked.
    // Requests without a token (e.g. a wrong password at sign-in) are left alone.
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    // The server's id for this request (also in its logs), so an error can be traced end to end.
    const requestId = body?.requestId ?? error.response?.headers?.['x-request-id'];
    // No response at all (network down, API unreachable, timeout): the server never saw it, so report it.
    if (!error.response) reportError({ kind: 'request', error, message: `${error.config?.method?.toUpperCase()} ${error.config?.url}: ${error.message}` });
    return Promise.reject(Object.assign(error, { userMessage: message, code: body?.code ?? error.code, requestId, retryAfter }));
  },
);

/**
 * For lookups where "doesn't exist" is a normal answer: `.catch(nullIfNotFound)` turns a 404
 * into `null`, the same as sample-data mode, so pages show their "not found" state.
 * Every other error is re-thrown, so pages show their error state with "Try again".
 */
export function nullIfNotFound(error) {
  if (error.response?.status === 404) return null;
  throw error;
}

/** Simulates network latency for sample data so loading states are exercised during development. */
export const mockDelay = (data, ms = 650) => new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));
