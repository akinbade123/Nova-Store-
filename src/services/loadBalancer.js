/**
 * Client-side load balancer for the NOVA API.
 *
 * - Round-robin across every healthy backend endpoint.
 * - An endpoint that fails (network error, timeout, 502/503/504) is taken out of
 *   rotation for a cool-down period, then tried again.
 * - Safe (idempotent) requests are retried on the next endpoint; requests that change
 *   data (POST/PUT/PATCH/DELETE) are never retried, so an order can't be placed twice.
 *
 * With a single endpoint this behaves exactly like a plain base URL.
 */

const COOLDOWN_MS = 30_000;
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options']);

export function parseEndpoints(...sources) {
  for (const source of sources) {
    const list = (source ?? '')
      .split(',')
      .map((url) => url.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    if (list.length) return [...new Set(list)];
  }
  return ['/api'];
}

export function createLoadBalancer(urls, { cooldownMs = COOLDOWN_MS } = {}) {
  const nodes = urls.map((url) => ({ url, downUntil: 0 }));
  let cursor = 0;

  /** Next endpoint in rotation, skipping unhealthy ones and any listed in `exclude`. */
  function pick(exclude = []) {
    const now = Date.now();
    const candidates = nodes.filter((node) => !exclude.includes(node.url));
    if (!candidates.length) return null;

    const healthy = candidates.filter((node) => node.downUntil <= now);
    if (healthy.length) {
      const node = healthy[cursor % healthy.length];
      cursor = (cursor + 1) % Number.MAX_SAFE_INTEGER;
      return node.url;
    }
    // Everything is cooling down: use the endpoint that recovers soonest rather than failing outright.
    return candidates.reduce((a, b) => (a.downUntil <= b.downUntil ? a : b)).url;
  }

  function markDown(url) {
    const node = nodes.find((item) => item.url === url);
    if (node) node.downUntil = Date.now() + cooldownMs;
  }

  function markUp(url) {
    const node = nodes.find((item) => item.url === url);
    if (node) node.downUntil = 0;
  }

  return { pick, markDown, markUp, size: nodes.length };
}

/** True when the failure points at the server/endpoint rather than the request itself. */
export function isEndpointFailure(error) {
  if (error.code === 'ERR_CANCELED') return false;
  if (!error.response) return true; // network error, DNS failure, CORS/connection refused, timeout
  return RETRYABLE_STATUS.has(error.response.status);
}

/**
 * Wires the balancer into an axios instance: picks an endpoint per request,
 * tracks endpoint health and fails over safe requests.
 */
export function attachLoadBalancer(instance, balancer) {
  instance.interceptors.request.use((config) => {
    // Absolute URLs bypass the balancer.
    if (/^https?:\/\//i.test(config.url ?? '')) return config;
    const tried = config.lb?.tried ?? [];
    config.baseURL = balancer.pick(tried) ?? balancer.pick();
    config.lb = { tried: [...tried, config.baseURL] };
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      if (response.config.lb) balancer.markUp(response.config.baseURL);
      return response;
    },
    (error) => {
      const config = error.config;
      if (!config?.lb || !isEndpointFailure(error)) return Promise.reject(error);

      balancer.markDown(config.baseURL);

      const method = (config.method ?? 'get').toLowerCase();
      const canRetry = IDEMPOTENT_METHODS.has(method) && config.lb.tried.length < balancer.size;
      return canRetry ? instance.request(config) : Promise.reject(error);
    },
  );
}
