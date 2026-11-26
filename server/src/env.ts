/** Configuration from environment variables. See .env.example for what each one does. */
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || undefined;

if (isProduction && !databaseUrl) {
  throw new Error('DATABASE_URL is required in production. The embedded database is for development only.');
}

export const env = {
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  /** PostgreSQL connection string. Without it, an embedded PGlite database is used (development only). */
  databaseUrl,
  /** Where the embedded development database keeps its files. */
  pgliteDir: process.env.PGLITE_DIR ?? '.data/dev',
  /** The storefront's public URL, used for links in emails. */
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  /** Where support messages are sent. */
  supportEmail: process.env.SUPPORT_EMAIL ?? 'support@nova.store',
};
