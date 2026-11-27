/** Configuration from environment variables. See .env.example for what each one does. */
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || undefined;

if (isProduction && !databaseUrl) {
  throw new Error('DATABASE_URL is required in production. The embedded database is for development only.');
}

// Links in emails and the address shoppers are told to write to must be real in production.
for (const name of ['APP_URL', 'SUPPORT_EMAIL']) {
  if (isProduction && !process.env[name]) {
    throw new Error(`${name} is required in production. See server/.env.example.`);
  }
}

export const env = {
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  /** PostgreSQL connection string. Without it, an embedded PGlite database is used (development only). */
  databaseUrl,
  /** Where the embedded development database keeps its files. */
  pgliteDir: process.env.PGLITE_DIR ?? '.data/dev',
  /** The storefront's public URL, used for links in emails. Required in production. */
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  /** Where support messages are sent, and the address emails tell shoppers to contact. Required in production. */
  supportEmail: process.env.SUPPORT_EMAIL ?? 'support@example.com',
  /** How many proxies sit in front of the API (e.g. 1 behind a Vercel rewrite). 0: ignore X-Forwarded-For. */
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 0),
};
