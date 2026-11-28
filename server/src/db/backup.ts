/**
 * `npm run db:backup`: a full logical backup of the database in DATABASE_URL (docs/BACKUPS.md).
 *
 * Writes two files to backups/ (or the folder given with --out):
 *   nova-<time>.dump         pg_dump's custom format, restorable with pg_restore
 *   nova-<time>.census.json  row counts per table and the latest migration, taken from the SAME
 *                            snapshot as the dump, so `npm run db:restore-test` can prove the restore
 *                            is complete even if orders were being placed during the backup.
 *
 * The dump contains customers' personal data. Keep it out of git (backups/ is ignored) and store copies
 * encrypted, off this machine.
 */
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import pg from 'pg';
import { env } from '../env.ts';
import { redact, runPgDump, takeCensus } from './pgTools.ts';

const { values } = parseArgs({ options: { out: { type: 'string', default: 'backups' } } });

if (!env.databaseUrl) {
  console.error('Set DATABASE_URL to the database to back up. (The embedded development database is disposable: npm run db:reset.)');
  process.exit(1);
}

const outDir = resolve(values.out!);
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const dumpFile = join(outDir, `nova-${stamp}.dump`);
const censusFile = join(outDir, `nova-${stamp}.census.json`);

const started = Date.now();
const client = new pg.Client({ connectionString: env.databaseUrl });
await client.connect();
try {
  // Freeze a snapshot, count the rows in it, and have pg_dump read that exact snapshot.
  // Needs a direct connection: transaction-mode poolers (PgBouncer) can't share snapshots.
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const { rows } = await client.query<{ snapshot: string }>('SELECT pg_export_snapshot() AS snapshot');
  const census = await takeCensus(client);
  const { rows: version } = await client.query<{ server_version: string }>('SHOW server_version');

  await runPgDump(['--format=custom', '--no-owner', '--no-privileges', `--snapshot=${rows[0]!.snapshot}`], {
    url: env.databaseUrl,
    stdoutFile: dumpFile,
  });
  await client.query('COMMIT');

  writeFileSync(
    censusFile,
    JSON.stringify(
      { createdAt: new Date(started).toISOString(), source: redact(env.databaseUrl), serverVersion: version[0]!.server_version, ...census },
      null,
      2,
    ) + '\n',
  );
  const rowsTotal = Object.values(census.tables).reduce((sum, n) => sum + n, 0);
  console.log(`Backup written in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`  ${dumpFile} (${(statSync(dumpFile).size / 1024).toFixed(0)} KB)`);
  console.log(`  ${censusFile} (${Object.keys(census.tables).length} tables, ${rowsTotal} rows, ${census.migrations.count} migrations)`);
  console.log(`Check it restores: npm run db:restore-test -- ${dumpFile}`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}
