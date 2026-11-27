/** `npm run db:migrate`: applies pending migrations from ./drizzle. Safe to run repeatedly. */
import { createDb } from './client.ts';
import { env } from '../env.ts';

const database = await createDb({ url: env.databaseUrl, dataDir: env.databaseUrl ? undefined : env.pgliteDir });
await database.migrate();
await database.close();
console.log('Migrations applied.');
