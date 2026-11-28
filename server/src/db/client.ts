import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './schema.ts';
import { APP_ROLE, ensureAppRole } from './roles.ts';

/** The database handle every module receives. A transaction (`db.transaction(tx => …)`) is also a Db. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** PostgreSQL extensions the migrations use. PGlite has to be given them when it starts. */
export const PGLITE_EXTENSIONS = { pg_trgm };

/**
 * Connection limits for PostgreSQL. Each API instance opens up to `max` connections, so
 * instances × max must stay below what the database plan allows (often 20–100 on small plans);
 * past that, put a pooler such as PgBouncer in front.
 */
export type PoolOptions = {
  /** Most connections this instance opens. Default 10. */
  max?: number;
  /** Longest any one query may run before PostgreSQL cancels it, in ms. Default 15 s. */
  statementTimeoutMs?: number;
};

/** Any fixed number: the advisory lock key that serialises migrations across copies of the API. */
const MIGRATION_LOCK = 7_431_209;

export type Database = {
  /** The API's connection: the restricted role nova_app, subject to row-level security. */
  db: Db;
  /** Applies migrations as the tables' owner, then (re)grants the restricted role. */
  migrate: () => Promise<void>;
  /** Runs `work` as the tables' owner, bypassing row-level security: admin scripts and tests only. */
  asOwner: <T>(work: (db: Db) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
};

/**
 * PostgreSQL when `url` is set (production, staging). Otherwise PGlite, a real PostgreSQL that runs
 * inside Node: in `dataDir` for local development, or in memory when neither is given (tests).
 *
 * The API never runs as the tables' owner. `url` should log in as a role that is only a member of
 * nova_app; migrations use `migrationUrl` (the owner), defaulting to `url`. Every API connection
 * switches to nova_app before its first query, so row-level security applies even when both URLs
 * are the same, as in development.
 */
export async function createDb({
  url,
  migrationUrl = url,
  dataDir,
  pool: poolOptions = {},
}: { url?: string; migrationUrl?: string; dataDir?: string; pool?: PoolOptions } = {}): Promise<Database> {
  if (url) {
    const pool = new pg.Pool({
      connectionString: url,
      max: poolOptions.max ?? 10,
      // Fail fast with a clear error when the database is unreachable or full, instead of queueing forever.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      // A runaway query is cancelled rather than holding a connection and slowing everyone else.
      statement_timeout: poolOptions.statementTimeoutMs ?? 15_000,
      // Switch to the restricted role as the connection opens. If that fails (the role doesn't exist
      // yet, or the login isn't a member), the connection is refused: nothing ever runs as the owner.
      // Connection poolers that reject startup options (PgBouncer, some hosted poolers) need the
      // login role itself to be the restricted one, which is the recommended setup anyway.
      options: `-c role=${APP_ROLE}`,
    });
    const db = drizzlePg(pool, { schema }) as unknown as Db;
    // Migrations and admin work get their own connection, as the owner and without the query time
    // limit: building an index on a large table can take longer than any request should.
    const asOwner = async <T,>(work: (owner: Db) => Promise<T>) => {
      const owner = new pg.Pool({ connectionString: migrationUrl, max: 1 });
      try {
        return await work(drizzlePg(owner, { schema }) as unknown as Db);
      } finally {
        await owner.end();
      }
    };
    return {
      db,
      // Every copy migrates as it starts, and copies start together. The lock makes the others wait
      // while the first one migrates, then find nothing to do; without it, two copies applying the
      // same migration at once crash with "already exists". The owner pool has one connection, so
      // the lock and the migration share a session.
      migrate: () =>
        asOwner(async (owner) => {
          await owner.execute(sql`SELECT pg_advisory_lock(${MIGRATION_LOCK})`);
          try {
            await migratePg(owner as never, { migrationsFolder });
            await ensureAppRole(owner);
          } finally {
            await owner.execute(sql`SELECT pg_advisory_unlock(${MIGRATION_LOCK})`);
          }
        }),
      asOwner,
      close: () => pool.end(),
    };
  }
  // PGlite creates its own folder but not missing parents (e.g. .data/ on a fresh clone).
  if (dataDir) mkdirSync(dirname(resolve(dataDir)), { recursive: true });
  const client = new PGlite({ dataDir, extensions: PGLITE_EXTENSIONS });
  const db = drizzlePglite(client, { schema }) as unknown as Db;
  // One connection: switch it between the owner and the restricted role. An existing database
  // already has the role, so restrict straight away; a new one gets it from migrate().
  const restrict = async () => {
    const { rows } = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}'`);
    if (rows.length) await client.exec(`SET ROLE ${APP_ROLE}`);
  };
  await restrict();
  const asOwner = async <T,>(work: (owner: Db) => Promise<T>) => {
    await client.exec('RESET ROLE');
    try {
      return await work(db);
    } finally {
      await restrict();
    }
  };
  return {
    db,
    migrate: () =>
      asOwner(async () => {
        await migratePglite(db as never, { migrationsFolder });
        await ensureAppRole(db);
      }),
    asOwner,
    close: () => client.close(),
  };
}
