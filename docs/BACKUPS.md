# Backups and restores

How NOVA's production database is backed up, how to check a backup actually restores, and what to do when data needs recovering. The development database (`server/.data/`) is disposable and isn't backed up: `npm run db:reset` rebuilds it.

## Two layers of protection

| Layer | What it covers | Who runs it |
|---|---|---|
| **1. The database host's automatic backups, with point-in-time recovery (PITR)** | Everything, to any second in the retention window. This is what you use after a bad deploy or an accidental delete. | The host, automatically |
| **2. Our own logical backups** (`npm run db:backup`) | A full copy that doesn't depend on the host: for moving hosts, for keeping history longer than the host's window, and for a host outage or account problem. | Us, on a schedule |

Layer 1 does most of the work. Layer 2 means one company's problem can't take all copies with it.

### Choosing the production host

Pick a managed PostgreSQL 17 that offers all of these, and turn them on before launch:

- [ ] Automatic daily backups, kept at least **7 days** (30 is better once orders flow)
- [ ] **Point-in-time recovery** within that window
- [ ] Backups stored encrypted, in a different location from the database
- [ ] A **direct** (non-pooled) connection string for backups. Poolers in transaction mode, like PgBouncer, break `db:backup`'s consistent snapshot.

Neon, Supabase, AWS RDS and Render all meet this on their paid plans. Write the choice and its retention settings in the log at the bottom.

## Our backups

```bash
cd server
DATABASE_URL=postgres://… npm run db:backup
npm run db:restore-test -- backups/nova-<time>.dump
```

**`db:backup`** writes two files to `server/backups/`:

- `nova-<time>.dump`: the whole database in `pg_dump`'s custom format.
- `nova-<time>.census.json`: every table's row count and the latest migration.

Both come from **one database snapshot**, so they match exactly even while customers are placing orders. Tested: 376 sign-ups were written during a backup, and the backup and its restore both had the same count.

**`db:restore-test`** proves a backup is usable, without touching any real database:

1. It starts a throwaway PostgreSQL 17 in Docker.
2. It restores the dump, stopping at the first error.
3. It compares every table's row count and the migrations with the census file.
4. It starts the API on the restored copy and loads the catalogue.

Then it prints **PASS** or **FAIL** and deletes the container. It reports FAIL for a damaged dump, a missing table or a single row off.

**Requirements:** Docker for the restore test. For the backup, either the PostgreSQL client tools or Docker (it uses `postgres:17-alpine`; set `PG_TOOLS_IMAGE` if the server is a newer major version, since `pg_dump` must be at least the server's version).

**The dump contains customers' names, emails, addresses and orders.** `server/backups/` is ignored by git. Keep copies only in encrypted storage with restricted access (for example a private S3 or R2 bucket with encryption on), and delete local copies once uploaded.

### Schedule

| When | What |
|---|---|
| Continuously | The host's automatic backups and PITR (layer 1) |
| Weekly, and before every migration | `npm run db:backup`, then upload the two files to encrypted off-site storage |
| Monthly | `npm run db:restore-test` on the latest off-site backup. Record the result below. |
| Quarterly | Restore drill on the host: restore to a point in time as a **new** database, point a staging copy of the API at it, and check orders and accounts look right. |

## Recovering data

Stay calm and don't write to the damaged database while you work.

1. **Decide the moment to go back to**: just before the bad deploy, mistaken delete or corruption. Check deploy times and logs.
2. **Restore into a new database, never over the live one.**
   - *Host PITR (usual case)*: use the host's "restore to point in time" or "branch from time" to create a new database at that moment.
   - *Our dump*: create an empty PostgreSQL 17 database, then `pg_restore --no-owner --no-privileges --exit-on-error -d "<new database url>" nova-<time>.dump`.
3. **Check the new database**: row counts against the census file (or against yesterday's numbers), and a few known recent orders and accounts.
4. **Switch over**: put the storefront in maintenance mode, point `DATABASE_URL` and `DATABASE_MIGRATION_URL` at the new database, create the API's login role there (server/README.md, "Database roles"; roles aren't part of a database's backup), run `npm run db:migrate` (harmless if nothing's pending; it also restores the `nova_app` grants, which backups leave out), restart the API, and check the shop, sign-in and order history.
5. **Recover anything written after the restore point** from the old database if it's still readable (for example orders placed after the bad deploy), then keep the old database for a week before deleting it.
6. **Write down** what happened, the restore point and how long it took.

**Targets:** lose at most 5 minutes of data (RPO, met by PITR) and be back within 1 hour (RTO). A restore of today's database takes about 4 seconds; expect minutes as it grows.

## Restore test log

| Date | Backup | Restored into | Result | Notes |
|---|---|---|---|---|
| 2026-11-26 | PostgreSQL 17 stand-in for production: 17 tables, 602 rows, 58 KB | Throwaway PostgreSQL 17 (Docker) | **PASS**, 4.3 s | Also checked: a damaged dump and a wrong count both report FAIL; a backup taken during 376 live writes restores exactly. Production host not chosen yet. |
| 2026-11-26 | Same database after migrations `0001` and `0002` (backed up first, as above): 980 rows, 3 migrations | Throwaway PostgreSQL 17 (Docker) | **PASS**, 4.1 s | The new constraints restore with the data. |
