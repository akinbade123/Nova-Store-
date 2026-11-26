/** Starts the API server: `npm run dev` (restarts on changes) or `npm start`. */
import { serve } from '@hono/node-server';
import { count } from 'drizzle-orm';
import { createApp } from './app.ts';
import { createDb } from './db/client.ts';
import { products } from './db/schema.ts';
import { seed } from './db/seed.ts';
import { env } from './env.ts';
import { createConsoleMailer } from './lib/email.ts';

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

if (env.isProduction) console.warn('Using the console mailer: emails are printed, not sent. Connect an email provider before launch.');
const app = createApp({ db: database.db, mailer: createConsoleMailer(), appUrl: env.appUrl, supportEmail: env.supportEmail });

const server = serve({ fetch: app.fetch, port: env.port }, ({ port }) => {
  console.log(`NOVA API listening on http://localhost:${port}/api (${env.databaseUrl ? 'PostgreSQL' : `embedded database in ${env.pgliteDir}`})`);
});

const shutdown = () => {
  server.close();
  database.close().finally(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
