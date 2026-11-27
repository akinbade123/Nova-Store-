/**
 * Usage counters for cost and capacity: requests per route and emails by outcome, kept in memory
 * and written as one "Usage summary" log line per hour by each instance (src/index.ts).
 *
 * A log service (Vercel log drains, Better Stack, Datadog…) can chart these lines and alert on them
 * without storing every request: sum `requests.total` across instances for traffic, `emails.sent`
 * for the email bill, `emails.droppedDaily` > 0 for "we hit the email ceiling". docs/COSTS.md has
 * the queries.
 */
import { hostname } from 'node:os';

type RouteStats = { count: number; errors: number; limited: number; slow: number; totalMs: number };
export type EmailOutcome = 'sent' | 'failed' | 'droppedPerAddress' | 'droppedDaily';

export type UsageMeter = {
  request: (route: string, status: number, durationMs: number) => void;
  email: (outcome: EmailOutcome) => void;
  /** Everything counted since the last flush, then starts again from zero. */
  flush: () => UsageSummary;
};

export type UsageSummary = {
  instance: string;
  from: string;
  to: string;
  requests: {
    total: number;
    errors: number;
    limited: number;
    slow: number;
    /** The busiest routes, by pattern (`/api/products/:slug`), so ids don't split them. */
    routes: Record<string, { count: number; errors: number; limited: number; slow: number; avgMs: number }>;
  };
  emails: Record<EmailOutcome, number>;
};

const SLOW_MS = 1000;
const TOP_ROUTES = 25;

export function createUsageMeter({ instance = `${hostname()}:${process.pid}` } = {}): UsageMeter {
  let from = new Date();
  let routes = new Map<string, RouteStats>();
  let emails: Record<EmailOutcome, number> = { sent: 0, failed: 0, droppedPerAddress: 0, droppedDaily: 0 };

  return {
    request(route, status, durationMs) {
      const stats = routes.get(route) ?? { count: 0, errors: 0, limited: 0, slow: 0, totalMs: 0 };
      stats.count += 1;
      if (status >= 500) stats.errors += 1;
      if (status === 429) stats.limited += 1;
      if (durationMs >= SLOW_MS) stats.slow += 1;
      stats.totalMs += durationMs;
      routes.set(route, stats);
    },
    email(outcome) {
      emails[outcome] += 1;
    },
    flush() {
      const all = [...routes.entries()];
      const sum = (key: keyof RouteStats) => all.reduce((total, [, stats]) => total + stats[key], 0);
      const summary: UsageSummary = {
        instance,
        from: from.toISOString(),
        to: new Date().toISOString(),
        requests: {
          total: sum('count'),
          errors: sum('errors'),
          limited: sum('limited'),
          slow: sum('slow'),
          routes: Object.fromEntries(
            all
              .sort(([, a], [, b]) => b.count - a.count)
              .slice(0, TOP_ROUTES)
              .map(([route, { totalMs, ...stats }]) => [route, { ...stats, avgMs: Math.round(totalMs / stats.count) }]),
          ),
        },
        emails,
      };
      from = new Date();
      routes = new Map();
      emails = { sent: 0, failed: 0, droppedPerAddress: 0, droppedDaily: 0 };
      return summary;
    },
  };
}
