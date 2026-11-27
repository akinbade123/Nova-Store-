/**
 * Helpers for the backup scripts (backup.ts, restore-test.ts): running PostgreSQL's own tools,
 * and taking a row count of every table so a restore can be checked against the original.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import type pg from 'pg';

/** The image used when pg_dump / pg_restore aren't installed. Its major version must be >= the server's. */
export const PG_IMAGE = process.env.PG_TOOLS_IMAGE ?? 'postgres:17-alpine';

const installed = (tool: string) => spawnSync('which', [tool]).status === 0;
export const hasDocker = () => spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;

/** Inside a container, "localhost" is the container itself; the host machine is host.docker.internal. */
function forDocker(url: string) {
  const parsed = new URL(url);
  if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsed.hostname)) parsed.hostname = 'host.docker.internal';
  return parsed.toString();
}

/**
 * Runs pg_dump with `args` against `url`, writing its output to `stdoutFile`: the local pg_dump if
 * installed, otherwise the same tool from the official Docker image (with `url` adjusted for Docker).
 */
export function runPgDump(args: string[], { url, stdoutFile }: { url: string; stdoutFile: string }): Promise<void> {
  const tool = 'pg_dump';
  const local = installed(tool);
  if (!local && !hasDocker()) {
    throw new Error(`${tool} isn't installed and Docker isn't running. Install the PostgreSQL client tools, or start Docker.`);
  }
  const [command, fullArgs] = local
    ? [tool, [...args, url]]
    : [
        'docker',
        ['run', '--rm', '-i', '--add-host=host.docker.internal:host-gateway', PG_IMAGE, tool, ...args, forDocker(url)],
      ];
  return new Promise((resolve, reject) => {
    const child = spawn(command, fullArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const file = createWriteStream(stdoutFile);
    child.stdout.pipe(file);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${tool} failed (exit ${code}):\n${stderr.trim()}`));
      // The pipe closes the file when pg_dump's output ends; wait until it's fully written.
      if (file.writableFinished) resolve();
      else file.on('finish', resolve);
    });
  });
}

export type Census = {
  /** Rows per table in the public schema. */
  tables: Record<string, number>;
  /** Applied Drizzle migrations: how many, and the hash of the latest. */
  migrations: { count: number; latest: string | null };
};

/** Counts every table's rows and the applied migrations, in whatever transaction `client` is in. */
export async function takeCensus(client: pg.Client | pg.PoolClient): Promise<Census> {
  const { rows: tableRows } = await client.query<{ name: string }>(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  const tables: Record<string, number> = {};
  for (const { name } of tableRows) {
    const { rows } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM "public"."${name.replace(/"/g, '""')}"`);
    tables[name] = rows[0]!.n;
  }
  const { rows: migrationRows } = await client.query<{ count: number; latest: string | null }>(
    `SELECT count(*)::int AS count, (SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1) AS latest
     FROM drizzle.__drizzle_migrations`,
  );
  return { tables, migrations: migrationRows[0]! };
}

/** The connection string without its password, safe to print or save. */
export const redact = (url: string) => {
  const parsed = new URL(url);
  if (parsed.password) parsed.password = '***';
  return parsed.toString();
};
