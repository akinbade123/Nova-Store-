/** Configuration from environment variables. See .env.example for what each one does. */
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || undefined;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Why a database URL isn't safe for production, or null. The connection must be encrypted and the
 * server's certificate checked (`sslmode=verify-full`), or anyone on the network path could read or
 * change every query, password hashes and orders included. A database on the same machine is exempt.
 */
export function databaseUrlProblem(name: string, value: string | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `${name} isn't a valid URL.`;
  }
  if (LOCAL_HOSTS.has(url.hostname)) return null;
  const mode = url.searchParams.get('sslmode');
  if (mode !== 'verify-full') {
    return `${name} must include sslmode=verify-full (for example .../nova?sslmode=verify-full), so the connection is encrypted and the database's certificate is checked (it has ${mode ? `sslmode=${mode}` : 'no sslmode'}). If your host uses its own certificate authority, also add sslrootcert=<path to its CA file>.`;
  }
  return null;
}

/** Every reason the settings aren't fit for production, so a bad deploy lists them all at once. */
export function productionProblems(vars: Record<string, string | undefined>): string[] {
  const problems: string[] = [];
  if (!vars.DATABASE_URL) problems.push('DATABASE_URL is required in production. The embedded database is for development only.');
  for (const name of ['DATABASE_URL', 'DATABASE_MIGRATION_URL']) {
    const problem = databaseUrlProblem(name, vars[name]);
    if (problem) problems.push(problem);
  }
  // Links in emails and the address shoppers are told to write to must be real, and links must be HTTPS:
  // reset and verification links carry tokens that mustn't cross the network unencrypted.
  if (!vars.APP_URL) problems.push('APP_URL is required in production: links in emails point to it.');
  else if (!vars.APP_URL.startsWith('https://')) problems.push(`APP_URL must start with https:// (it's ${vars.APP_URL}): reset and verification links carry tokens.`);
  if (!vars.SUPPORT_EMAIL) problems.push('SUPPORT_EMAIL is required in production: security emails tell shoppers to write to it.');
  return problems;
}

if (isProduction) {
  const problems = productionProblems(process.env);
  if (problems.length) {
    throw new Error(`Refusing to start: the production settings aren't safe.\n- ${problems.join('\n- ')}\nSee server/.env.example.`);
  }
}

export const env = {
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  /** PostgreSQL connection string. Without it, an embedded PGlite database is used (development only). */
  databaseUrl,
  /**
   * The tables' owner, for migrations only. Defaults to DATABASE_URL. In production set both:
   * DATABASE_URL logs in as a role that is only a member of nova_app (server/README.md).
   */
  databaseMigrationUrl: process.env.DATABASE_MIGRATION_URL || databaseUrl,
  /** Where the embedded development database keeps its files. */
  pgliteDir: process.env.PGLITE_DIR ?? '.data/dev',
  /** The storefront's public URL, used for links in emails. Required in production. */
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  /** Where support messages are sent, and the address emails tell shoppers to contact. Required in production. */
  supportEmail: process.env.SUPPORT_EMAIL ?? 'support@example.com',
  /** Most PostgreSQL connections each API instance opens (see PoolOptions in src/db/client.ts). */
  dbPoolMax: Number(process.env.DB_POOL_MAX ?? 10),
  /** Longest a query may run, in ms, before PostgreSQL cancels it. */
  dbStatementTimeoutMs: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 15_000),
  /** How many proxies sit in front of the API (e.g. 1 behind a Vercel rewrite). 0: ignore X-Forwarded-For. */
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 0),
};
