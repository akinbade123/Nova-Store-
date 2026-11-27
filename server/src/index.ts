/** Starts the API server: `npm run dev` (restarts on changes) or `npm start`. */
import { serve } from '@hono/node-server';
import { count } from 'drizzle-orm';
import { createApp } from './app.ts';
import { createDb } from './db/client.ts';
import { products } from './db/schema.ts';
import { seed } from './db/seed.ts';
import { purgeExpired } from './db/purge.ts';
import { env } from './env.ts';
import { createConsoleMailer, createProductionMailer } from './lib/email.ts';
import { logger } from './lib/logger.ts';

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
  createDb({ url: env.databaseUrl, dataDir: env.databaseUrl ? undefined : env.pgliteDir }),
);
await step('applying migrations', () => database.migrate());

// Development convenience: an empty embedded database is filled with the storefront's sample data.
if (!env.databaseUrl) {
  const [{ n }] = await database.db.select({ n: count() }).from(products);
  if (n === 0) {
    logger.info('Empty development database: loading the sample catalogue and demo account');
    await seed(database.db, { demoAccount: true });
  }
}

const app = createApp({ db: database.db, mailer, appUrl: env.appUrl, supportEmail: env.supportEmail, trustProxyHops: env.trustProxyHops });

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

const shutdown = (signal: string) => {
  logger.info('Shutting down', { signal });
  clearInterval(purgeTimer);
  server.close();
  database.close().finally(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Errors outside any request (a timer, a background email, a forgotten await). Logged with the stack, so
// they can be traced. An uncaught exception leaves the process in an unknown state, so it exits and the
// host restarts it; an unhandled rejection is logged and the server keeps running.
process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection', { error: reason }));
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception, exiting', { error });
  process.exit(1);
});
