/**
 * The restricted database role the API runs as. It can read and write rows, and nothing else: it
 * owns no tables, so it can't change the schema, drop tables or switch off row-level security, and
 * the row-level policies (drizzle/0005_row_level_security.sql) apply to it.
 *
 * Run after every migration, as the tables' owner. Idempotent, so it also restores the grants on a
 * database restored from a backup (backups don't include privileges).
 */
import { sql } from 'drizzle-orm';
import type { Db } from './client.ts';

export const APP_ROLE = 'nova_app';

const statements = [
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN CREATE ROLE ${APP_ROLE} NOLOGIN; END IF;
   END $$`,
  `GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`,
  `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`,
  // Accounting records are never deleted by the API: accounts and their orders are anonymised.
  `REVOKE DELETE ON users, orders, order_items, payment_events FROM ${APP_ROLE}`,
  // The readiness check counts applied migrations.
  `GRANT USAGE ON SCHEMA drizzle TO ${APP_ROLE}`,
  `GRANT SELECT ON drizzle.__drizzle_migrations TO ${APP_ROLE}`,
  // Lets the owner's own connection switch to the role (used in development and tests).
  `GRANT ${APP_ROLE} TO CURRENT_USER`,
];

export async function ensureAppRole(db: Db) {
  // One statement per call: PGlite, like prepared statements, takes a single command at a time.
  for (const statement of statements) await db.execute(sql.raw(statement));
}

/**
 * Whether the API's login is the tables' owner or a superuser. It still runs as nova_app, but a SQL
 * injection could then switch back with RESET ROLE, so production should log in as a role that is
 * only a member of nova_app.
 */
export async function loginCanBypassRestrictions(db: Db) {
  const result = (await db.execute(sql`
    SELECT (SELECT rolsuper FROM pg_roles WHERE rolname = session_user)
        OR session_user = (SELECT tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') AS bypass
  `)) as unknown as { rows: { bypass: boolean }[] };
  return Boolean(result.rows[0]?.bypass);
}
