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

// Emails carry reset and confirmation links, so production must send them, never print them to the logs.
// Checked before anything else, so a misconfigured deploy stops straight away with this message.
const mailer = env.isProduction ? createProductionMailer() : createConsoleMailer();
if (!mailer) {
  console.error('No email provider is connected. Connect one in createProductionMailer (src/lib/email.ts) before running in production.');
  process.exit(1);
}

const database = await createDb({ url: env.databaseUrl, dataDir: env.databaseUrl ? undefined : env.pgliteDir });
await database.migrate();

// Development convenience: an empty embedded database is filled with the storefront's sample data.
if (!env.databaseUrl) {
  const [{ n }] = await database.db.select({ n: count() }).from(products);
  if (n === 0) {
    console.log('Empty development database: loading the sample catalogue and demo account…');
    await seed(database.db, { demoAccount: true });
  }
}

const app = createApp({ db: database.db, mailer, appUrl: env.appUrl, supportEmail: env.supportEmail, trustProxyHops: env.trustProxyHops });

// Clear out ended sessions and spent links now and every 6 hours. A failure is logged, never fatal.
const purge = () =>
  purgeExpired(database.db).then(
    (removed) => Object.values(removed).some(Boolean) && console.log('Removed expired records:', removed),
    (error) => console.error('Purging expired records failed', error),
  );
await purge();
const purgeTimer = setInterval(purge, 6 * 60 * 60 * 1000);
purgeTimer.unref();

const server = serve({ fetch: app.fetch, port: env.port }, ({ port }) => {
  console.log(`NOVA API listening on http://localhost:${port}/api (${env.databaseUrl ? 'PostgreSQL' : `embedded database in ${env.pgliteDir}`})`);
});

const shutdown = () => {
  clearInterval(purgeTimer);
  server.close();
  database.close().finally(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
