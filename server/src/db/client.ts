import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
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

/**
 * PostgreSQL when `url` is set (production, staging). Otherwise PGlite, a real PostgreSQL that runs
 * inside Node: in `dataDir` for local development, or in memory when neither is given (tests).
 */
export async function createDb({ url, dataDir }: { url?: string; dataDir?: string } = {}) {
  if (url) {
    const pool = new pg.Pool({ connectionString: url });
    const db = drizzlePg(pool, { schema });
    return {
      db: db as unknown as Db,
      migrate: () => migratePg(db, { migrationsFolder }),
      close: () => pool.end(),
    };
  }
  // PGlite creates its own folder but not missing parents (e.g. .data/ on a fresh clone).
  if (dataDir) mkdirSync(dirname(resolve(dataDir)), { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  return {
    db: db as unknown as Db,
    migrate: () => migratePglite(db, { migrationsFolder }),
    close: () => client.close(),
  };
}
