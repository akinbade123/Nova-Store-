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
import * as schema from './schema.ts';

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

/**
 * PostgreSQL when `url` is set (production, staging). Otherwise PGlite, a real PostgreSQL that runs
 * inside Node: in `dataDir` for local development, or in memory when neither is given (tests).
 */
export async function createDb({ url, dataDir, pool: poolOptions = {} }: { url?: string; dataDir?: string; pool?: PoolOptions } = {}) {
  if (url) {
    const pool = new pg.Pool({
      connectionString: url,
      max: poolOptions.max ?? 10,
      // Fail fast with a clear error when the database is unreachable or full, instead of queueing forever.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      // A runaway query is cancelled rather than holding a connection and slowing everyone else.
      statement_timeout: poolOptions.statementTimeoutMs ?? 15_000,
    });
    const db = drizzlePg(pool, { schema });
    return {
      db: db as unknown as Db,
      // Migrations get their own connection without the query time limit: building an index on a
      // large table can take longer than any request should.
      migrate: async () => {
        const migrations = new pg.Pool({ connectionString: url, max: 1 });
        try {
          await migratePg(drizzlePg(migrations, { schema }), { migrationsFolder });
        } finally {
          await migrations.end();
        }
      },
      close: () => pool.end(),
    };
  }
  // PGlite creates its own folder but not missing parents (e.g. .data/ on a fresh clone).
  if (dataDir) mkdirSync(dirname(resolve(dataDir)), { recursive: true });
  const client = new PGlite({ dataDir, extensions: PGLITE_EXTENSIONS });
  const db = drizzlePglite(client, { schema });
  return {
    db: db as unknown as Db,
    migrate: () => migratePglite(db, { migrationsFolder }),
    close: () => client.close(),
  };
}
