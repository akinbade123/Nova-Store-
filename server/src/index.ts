/** Starts the API server: `npm run dev` (restarts on changes) or `npm start`. */
import { serve } from '@hono/node-server';
import { count } from 'drizzle-orm';
import { createApp } from './app.ts';
import { createDb } from './db/client.ts';
import { products } from './db/schema.ts';
import { seed } from './db/seed.ts';
import { purgeExpired } from './db/purge.ts';
import { loginCanBypassRestrictions } from './db/roles.ts';
import { env } from './env.ts';
import { createConsoleMailer, createProductionMailer } from './lib/email.ts';
import { logger } from './lib/logger.ts';
import { createUsageMeter } from './lib/usage.ts';

// Emails carry reset and confirmation links, so production must send them, never print them to the logs.
// Checked before anything else, so a misconfigured deploy stops straight away with this message.
const mailer = env.isProduction ? createProductionMailer() : createConsoleMailer();
if (!mailer) {
  logger.error('Refusing to start: no email provider is connected. Connect one in createProductionMailer (src/lib/email.ts) before running in production.');
  process.exit(1);
}

/** Runs one startup step; on failure, logs which step and why (the error's cause holds the database's reason). */
async function step<T>(name: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause;
    logger.error(`Startup failed while ${name}`, { error: cause instanceof Error ? cause : error });
    process.exit(1);
  }
}

const database = await step('connecting to the database', () =>
  createDb({ url: env.databaseUrl, migrationUrl: env.databaseMigrationUrl, readUrl: env.databaseReadUrl, dataDir: env.databaseUrl ? undefined : env.pgliteDir, pool: { max: env.dbPoolMax, statementTimeoutMs: env.dbStatementTimeoutMs } }),
);
await step('applying migrations', () => database.migrate());
if (env.isProduction && (await loginCanBypassRestrictions(database.db))) {
  logger.warn(
    'DATABASE_URL logs in as the tables’ owner. The API still runs as the restricted role nova_app, but a SQL injection could switch back. Log in as a role that is only a member of nova_app, and put the owner in DATABASE_MIGRATION_URL (server/README.md, "Database roles").',
  );
}

// Development convenience: an empty embedded database is filled with the storefront's sample data.
if (!env.databaseUrl) {
  const [{ n }] = await database.db.select({ n: count() }).from(products);
  if (n === 0) {
    logger.info('Empty development database: loading the sample catalogue and demo account');
    await seed(database.db, { demoAccount: true });
  }
}

// Requests and emails, logged as one "Usage summary" line per hour (docs/COSTS.md has the dashboard queries).
const usage = createUsageMeter();
const usageTimer = setInterval(() => logger.info('Usage summary', usage.flush()), 60 * 60 * 1000);
usageTimer.unref();

let shuttingDown = false;
const app = createApp({
  readDb: database.readDb,
  usage,
  isShuttingDown: () => shuttingDown,
  db: database.db,
  mailer,
  appUrl: env.appUrl,
  supportEmail: env.supportEmail,
  trustProxyHops: env.trustProxyHops,
  emailLimits: { perDay: env.emailDailyLimit, perRecipientPerHour: env.emailPerAddressPerHour },
});

// Clear out ended sessions and spent links now and every 6 hours. A failure is logged, never fatal.
const purge = () =>
  purgeExpired(database.db).then(
    (removed) => Object.values(removed).some(Boolean) && logger.info('Removed expired records', removed),
    (error) => logger.error('Purging expired records failed', { error }),
  );
await purge();
const purgeTimer = setInterval(purge, 6 * 60 * 60 * 1000);
purgeTimer.unref();

const server = serve({ fetch: app.fetch, port: env.port }, ({ port }) => {
  logger.info('NOVA API started', {
    url: `http://localhost:${port}/api`,
    database: env.databaseUrl ? 'postgresql' : `embedded (${env.pgliteDir})`,
    mailer: mailer.name,
    node: process.version,
  });
});

/**
 * Graceful shutdown, for deploys and scaling down. Hosts send SIGTERM, then kill the process if it
 * hasn't exited (Render and Railway allow about 30 s; on Fly.io raise kill_timeout to 20 s).
 * 1. Readiness answers 503, so the load balancer stops sending new requests here.
 * 2. After a short wait for it to notice, the server stops accepting connections.
 * 3. Requests in progress finish (up to SHUTDOWN_TIMEOUT_SECONDS), then the database pool closes.
 * A second Ctrl+C or SIGTERM exits straight away.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function shutdown(signal: string) {
  if (shuttingDown) {
    logger.warn('Second stop signal: exiting without waiting', { signal });
    process.exit(1);
  }
  shuttingDown = true;
  logger.info('Shutting down: readiness now answers 503', { signal, drainSeconds: env.shutdownDrainSeconds, timeoutSeconds: env.shutdownTimeoutSeconds });
  clearInterval(purgeTimer);
  clearInterval(usageTimer);
  await sleep(env.shutdownDrainSeconds * 1000);
  const http = server as unknown as import('node:http').Server;
  const finished = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), env.shutdownTimeoutSeconds * 1000);
    http.close(() => {
      clearTimeout(timer);
      resolve(true);
    });
    http.closeIdleConnections(); // keep-alive connections with no request in progress
  });
  if (!finished) {
    logger.warn('Requests still running at the shutdown timeout: closing them', { timeoutSeconds: env.shutdownTimeoutSeconds });
    http.closeAllConnections();
  }
  logger.info('Usage summary', usage.flush()); // the partial hour, so a deploy or restart doesn't lose it
  await database.close();
  logger.info('Stopped', { signal, requestsFinished: finished });
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// Errors outside any request (a timer, a background email, a forgotten await). Logged with the stack, so
// they can be traced. An uncaught exception leaves the process in an unknown state, so it exits and the
// host restarts it; an unhandled rejection is logged and the server keeps running.
process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection', { error: reason }));
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception, exiting', { error });
  process.exit(1);
});
