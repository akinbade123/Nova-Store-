/**
 * The system's own endpoints: health checks for monitors and load balancers, and the place the
 * storefront reports its crashes (docs/API.md, section 10).
 */
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { readBody } from '../../lib/validate.ts';
import { redactUrl } from '../../lib/logger.ts';
import type { AppEnv, Deps } from '../../types.ts';

const MINUTE = 60 * 1000;
const DB_TIMEOUT_MS = 2000;
const startedAt = Date.now();

/** How many migrations this build of the API expects to have been applied. */
const expectedMigrations: number = JSON.parse(
  readFileSync(new URL('../../../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
).entries.length;

type Check = { ok: boolean; ms?: number; detail?: string };

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms))]);

const clientError = z.object({
  message: z.string().trim().min(1).max(1000),
  name: z.string().max(100).optional(),
  stack: z.string().max(8000).optional(),
  componentStack: z.string().max(8000).optional(),
  url: z.string().max(2000).optional(),
  kind: z.enum(['render', 'error', 'unhandledrejection', 'request']).default('error'),
  /** The request id of a failed API call, when the crash followed one: links the two in the logs. */
  requestId: z.string().max(64).optional(),
  release: z.string().max(100).optional(),
  /** The reference shown to the shopper on the error page, so a support message finds this report. */
  reference: z.string().max(64).optional(),
});

export function systemRoutes(deps: Deps) {
  const { db, mailer, rateLimit } = deps;
  const app = new Hono<AppEnv>();

  // Liveness: the process is up and answering. Cheap enough to poll every few seconds.
  app.get('/health', (c) => c.json({ status: 'ok', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) }));

  /**
   * Readiness: can this instance serve shoppers right now? 200 when every critical check passes,
   * 503 when one fails, so a load balancer stops sending traffic and a monitor raises an alert.
   * Names and timings only: no hostnames, versions or data, because the endpoint is public.
   */
  app.get('/health/ready', async (c) => {
    // Shutting down: tell the load balancer first, so it stops sending new requests here while the
    // ones in progress finish (src/index.ts).
    if (deps.isShuttingDown()) return c.json({ status: 'shutting-down' }, 503);
    const checks: Record<string, Check> = {};
    const started = performance.now();
    try {
      await withTimeout(db.execute(sql`SELECT 1`), DB_TIMEOUT_MS);
      checks.database = { ok: true, ms: Math.round(performance.now() - started) };
    } catch (error) {
      checks.database = { ok: false, ms: Math.round(performance.now() - started), detail: 'not reachable' };
      c.get('log').error('Health check: database not reachable', { error });
    }
    if (checks.database.ok) {
      try {
        // node-postgres and PGlite both return { rows }; Drizzle's shared type doesn't say so.
        const result = (await db.execute(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`)) as unknown as { rows: { n: number }[] };
        const applied = result.rows[0]!.n;
        checks.migrations = applied >= expectedMigrations ? { ok: true } : { ok: false, detail: `${expectedMigrations - applied} not applied` };
      } catch {
        checks.migrations = { ok: false, detail: 'migration table missing' };
      }
    }
    // Not critical for browsing, so it doesn't fail the check; reported so it's noticed.
    checks.email = { ok: process.env.NODE_ENV !== 'production' || mailer.name !== 'console', detail: mailer.name };
    const memoryMb = Math.round(process.memoryUsage().rss / 1048576);
    const healthy = checks.database.ok && checks.migrations?.ok !== false;
    if (!healthy) c.get('log').warn('Health check failed', { checks });
    return c.json(
      { status: healthy ? 'ok' : 'unavailable', checks, memoryMb, uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) },
      healthy ? 200 : 503,
    );
  });

  // Crashes in shoppers' browsers, sent by src/services/errorReporter.js. Logged, not stored.
  app.post('/client-errors', rateLimit('client-errors', 20, MINUTE), async (c) => {
    // The report's requestId is the failed API call it followed; this request keeps its own id.
    const { requestId: failedRequestId, url, ...report } = await readBody(c, clientError);
    c.get('log').error('Storefront error', {
      ...report,
      url: url ? redactUrl(url) : undefined,
      failedRequestId,
      userAgent: c.req.header('user-agent')?.slice(0, 300),
    });
    return c.body(null, 204);
  });

  /**
   * Content-Security-Policy violation reports, sent by browsers when the storefront's policy blocks
   * something (vercel.json: report-uri and report-to). A burst of them can mean someone is trying to
   * inject a script, which is how a session token would be stolen. Logged, not stored.
   * Accepts both formats: the older `application/csp-report` and the Reporting API's list.
   */
  app.post('/csp-reports', rateLimit('csp-reports', 20, MINUTE), async (c) => {
    let payload: unknown;
    try {
      payload = JSON.parse(await c.req.text());
    } catch {
      return c.body(null, 204); // browsers don't act on the answer; ignore junk quietly
    }
    const text = (value: unknown, max = 300) => (typeof value === 'string' ? redactUrl(value).slice(0, max) : undefined);
    const reports: Record<string, unknown>[] = Array.isArray(payload)
      ? payload.filter((item) => item?.type === 'csp-violation').map((item) => item.body ?? {})
      : [((payload as { 'csp-report'?: Record<string, unknown> })?.['csp-report'] ?? {})];
    for (const report of reports.slice(0, 10)) {
      c.get('log').warn('CSP violation', {
        page: text(report.documentURL ?? report['document-uri']),
        blocked: text(report.blockedURL ?? report['blocked-uri']),
        directive: text(report.effectiveDirective ?? report['effective-directive'] ?? report['violated-directive'], 100),
        source: text(report.sourceFile ?? report['source-file']),
        line: typeof (report.lineNumber ?? report['line-number']) === 'number' ? (report.lineNumber ?? report['line-number']) : undefined,
        sample: text(report.sample ?? report['script-sample'], 100),
        disposition: text(report.disposition, 20),
        userAgent: c.req.header('user-agent')?.slice(0, 300),
      });
    }
    return c.body(null, 204);
  });

  return app;
}
