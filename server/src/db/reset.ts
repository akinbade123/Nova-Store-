/**
 * `npm run db:reset`: deletes the embedded development database. The next `npm run dev` recreates it
 * with the sample data. Refuses to touch a real PostgreSQL database.
 */
import { rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { env } from '../env.ts';

if (env.databaseUrl) {
  throw new Error('DATABASE_URL is set. db:reset only deletes the embedded development database, never a real one.');
}
const dir = resolve(env.pgliteDir);
if (!dir.startsWith(resolve('.data') + sep)) {
  throw new Error(`Refusing to delete ${dir}: PGLITE_DIR must be inside ./.data`);
}
await rm(dir, { recursive: true, force: true });
console.log(`Deleted ${dir}. Run npm run dev to recreate it with the sample data.`);
