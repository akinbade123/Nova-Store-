/**
 * `npm run db:restore-test -- backups/nova-<time>.dump`: proves a backup can be restored (docs/BACKUPS.md).
 *
 * 1. Starts a throwaway PostgreSQL in Docker (nothing else is touched).
 * 2. Restores the dump into it with pg_restore, stopping at the first error.
 * 3. Compares every table's row count and the migrations with the backup's .census.json.
 * 4. Starts the API on the restored copy and checks that it serves the catalogue.
 * Prints PASS or FAIL (exit code 0 or 1), then removes the container.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, openSync, readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import pg from 'pg';
import { createApp } from '../app.ts';
import { createConsoleMailer } from '../lib/email.ts';
import { createDb } from './client.ts';
import { type Census, PG_IMAGE, hasDocker, takeCensus } from './pgTools.ts';

const { positionals } = parseArgs({ allowPositionals: true });
const dumpFile = positionals[0];
const censusFile = dumpFile?.replace(/\.dump$/, '.census.json');
if (!dumpFile || !existsSync(dumpFile) || !censusFile || !existsSync(censusFile)) {
  console.error('Usage: npm run db:restore-test -- backups/nova-<time>.dump   (its .census.json must be next to it)');
  process.exit(1);
}
if (!hasDocker()) {
  console.error('The restore test runs a throwaway PostgreSQL in Docker. Start Docker and try again.');
  process.exit(1);
}

const expected = JSON.parse(readFileSync(censusFile, 'utf8')) as Census & { createdAt: string };
const name = `nova-restore-test-${process.pid}`;
const docker = (...args: string[]) => spawnSync('docker', args, { encoding: 'utf8' });
const started = Date.now();
let passed = false;

try {
  // 1. A throwaway server on a random local port.
  const run = docker('run', '-d', '--rm', '--name', name, '-e', 'POSTGRES_PASSWORD=restore-test', '-e', 'POSTGRES_DB=restored', '-p', '127.0.0.1::5432', PG_IMAGE);
  if (run.status !== 0) throw new Error(`Couldn't start PostgreSQL in Docker:\n${run.stderr}`);
  // The image starts a temporary server for setup first; TCP on 127.0.0.1 only answers once the real one is up.
  for (let i = 0; docker('exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres').status !== 0; i++) {
    if (i > 60) throw new Error('PostgreSQL in Docker didn’t become ready within 30 seconds.');
    await sleep(500);
  }
  const port = docker('port', name, '5432').stdout.trim().split(':').pop();
  const url = `postgres://postgres:restore-test@127.0.0.1:${port}/restored`;

  // 2. Restore, stopping at the first error.
  const restore = spawnSync(
    'docker',
    ['exec', '-i', name, 'pg_restore', '--exit-on-error', '--no-owner', '--no-privileges', '-U', 'postgres', '-d', 'restored'],
    { stdio: [openSync(dumpFile, 'r'), 'pipe', 'pipe'], encoding: 'utf8' },
  );
  if (restore.status !== 0) throw new Error(`pg_restore failed:\n${restore.stderr.trim()}`);
  const restoredIn = (Date.now() - started) / 1000;

  // 3. Same tables, same row counts, same migrations.
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const actual = await takeCensus(client);
  await client.end();
  const problems: string[] = [];
  const tables = [...new Set([...Object.keys(expected.tables), ...Object.keys(actual.tables)])].sort();
  console.log(`Backup taken ${expected.createdAt}. Restored into PostgreSQL (${PG_IMAGE}) in ${restoredIn.toFixed(1)}s.\n`);
  console.log('  table                     backup   restored');
  for (const table of tables) {
    const [want, got] = [expected.tables[table], actual.tables[table]];
    const ok = want === got;
    if (!ok) problems.push(`${table}: ${want ?? 'missing'} in the backup, ${got ?? 'missing'} after restore`);
    console.log(`  ${ok ? ' ' : '✗'} ${table.padEnd(24)} ${String(want ?? '—').padStart(6)}   ${String(got ?? '—').padStart(8)}`);
  }
  if (actual.migrations.count !== expected.migrations.count || actual.migrations.latest !== expected.migrations.latest) {
    problems.push(`migrations: ${expected.migrations.count} in the backup, ${actual.migrations.count} after restore`);
  }

  // 4. The API itself can use the restored database.
  const database = await createDb({ url });
  const app = createApp({ db: database.db, mailer: createConsoleMailer({ quiet: true }), rateLimits: false });
  for (const path of ['/api/health', '/api/categories', '/api/products?limit=1']) {
    const res = await app.request(path);
    if (res.status !== 200) problems.push(`API ${path} answered ${res.status} on the restored database`);
  }
  await database.close();

  console.log(`\n  migrations: ${actual.migrations.count} (backup: ${expected.migrations.count}); API answered /health, /categories, /products`);
  if (problems.length) {
    console.log(`\nFAIL — the restore doesn't match the backup:\n  - ${problems.join('\n  - ')}`);
  } else {
    passed = true;
    console.log(`\nPASS — every table and migration matches, and the API runs on the restored copy. Total ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  }
} catch (error) {
  console.log(`\nFAIL — ${(error as Error).message}`);
} finally {
  docker('rm', '-f', name);
}
process.exit(passed ? 0 : 1);
