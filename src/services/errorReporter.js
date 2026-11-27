/**
 * Sends crashes in shoppers' browsers to the API (POST /api/client-errors), where they're logged next to
 * the server's own errors. Without this, a bug that only happens in someone's browser is invisible.
 *
 * - Reports render crashes (from ErrorBoundary), uncaught errors, unhandled promise rejections, and
 *   requests that never reached the server.
 * - At most 10 reports per page load, and each distinct error once, so a crash loop can't flood the API.
 * - Ignores errors from browser extensions and other sites' scripts.
 * - Sample-data mode has no API: errors only go to the console.
 */
// Read directly rather than from api.js, which imports this file.
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

const MAX_REPORTS = 10;
const sent = new Set();

/** A short reference to show the shopper and to include in the report: "ui_k3j9x2". */
export const newReference = () => `ui_${Math.random().toString(36).slice(2, 8)}`;

const clip = (value, max) => (typeof value === 'string' && value.length > max ? `${value.slice(0, max)}…` : value || undefined);

/**
 * `kind`: 'render' | 'error' | 'unhandledrejection' | 'request'.
 * `requestId`: the failed API call this followed, if any (axios errors carry it as error.requestId).
 */
export function reportError({ kind = 'error', error, message, componentStack, reference }) {
  const text = message ?? error?.message ?? String(error);
  const key = `${kind}:${text}`;
  if (sent.has(key) || sent.size >= MAX_REPORTS) return;
  sent.add(key);

  if (USE_MOCK_DATA || import.meta.env.DEV) console.error(`[${kind}]`, error ?? text, componentStack ?? '');
  if (USE_MOCK_DATA) return;

  const report = {
    kind,
    message: clip(text, 1000),
    name: clip(error?.name, 100),
    stack: clip(error?.stack, 8000),
    componentStack: clip(componentStack, 8000),
    url: clip(window.location.href, 2000),
    requestId: clip(error?.requestId, 64),
    reference,
  };
  // fetch, not the axios client: a failing report must never trigger another report or a sign-out.
  // keepalive lets the report finish even if the page is closing.
  fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/client-errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    keepalive: true,
  }).catch(() => {});
}

/** Catches what nothing else does: uncaught errors and unhandled promise rejections. Call once at startup. */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    // Only our own code: browser extensions and third-party scripts show up here too.
    if (event.filename && !event.filename.startsWith(window.location.origin)) return;
    reportError({ kind: 'error', error: event.error, message: event.error ? undefined : event.message });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportError({ kind: 'unhandledrejection', error: event.reason instanceof Error ? event.reason : undefined, message: event.reason instanceof Error ? undefined : String(event.reason) });
  });
}
