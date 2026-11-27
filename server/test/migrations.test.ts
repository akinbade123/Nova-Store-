/**
 * Upgrading an existing database, not just creating a fresh one. Runs the migration files in order on
 * data written by older versions of the app, the way production will be upgraded.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const folder = new URL('../drizzle/', import.meta.url);
const files = readdirSync(folder).filter((name) => name.endsWith('.sql')).sort();
const run = async (db: PGlite, file: string) => {
  for (const statement of readFileSync(new URL(file, folder), 'utf8').split('--> statement-breakpoint')) {
    if (statement.trim()) await db.exec(statement);
  }
};

describe('migrations upgrade existing data', () => {
  it('0002 normalises emails stored by older versions before enforcing lowercase', async () => {
    const db = new PGlite();
    try {
      const upTo = files.indexOf(files.find((name) => name.startsWith('0002'))!);
      for (const file of files.slice(0, upTo)) await run(db, file);
      // What older versions could leave behind: a deleted account's placeholder built from the
      // (capitalised) user id, an anonymised order, and newsletter rows differing only in case.
      await db.exec(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, deleted_at)
          VALUES ('u-ABC', 'deleted+u-ABC@nova.invalid', 'x', 'Deleted', 'user', now());
        INSERT INTO orders (id, checkout_id, status, currency, email, phone, marketing, shipping_address, billing_address,
          shipping_label, shipping_eta, delivery_min_date, delivery_max_date, subtotal_cents, discount_cents, shipping_cents,
          total_cents, payment_method)
          VALUES ('NV-OLD', gen_random_uuid(), 'paid', 'USD', 'deleted+u-ABC@nova.invalid', '', false, '{}', '{}', 'S', 'x',
          '2026-12-01', '2026-12-02', 100, 0, 0, 100, 'card');
        INSERT INTO newsletter_subscribers (email, source) VALUES ('Ada@X.com', 'old'), ('ada@x.com', 'old'), (' Bo@X.com', 'old');
      `);
      for (const file of files.slice(upTo)) await run(db, file);
      const emails = async (q: string) => (await db.query<{ email: string }>(q)).rows.map((row) => row.email).sort();
      assert.deepEqual(await emails(`SELECT email FROM users`), ['deleted+u-abc@nova.invalid']);
      assert.deepEqual(await emails(`SELECT email FROM orders`), ['deleted+u-abc@nova.invalid']);
      assert.deepEqual(await emails(`SELECT email FROM newsletter_subscribers`), ['ada@x.com', 'bo@x.com']);
      await assert.rejects(db.exec(`INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ('u-NEW', 'New@X.com', 'x', 'A', 'B')`));
    } finally {
      await db.close();
    }
  });

  it('stops rather than guess when two real accounts differ only in capitals', async () => {
    const db = new PGlite();
    try {
      const upTo = files.indexOf(files.find((name) => name.startsWith('0002'))!);
      for (const file of files.slice(0, upTo)) await run(db, file);
      await db.exec(`INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ('u-1', 'sam@x.com', 'x', 'A', 'B'), ('u-2', 'Sam@x.com', 'x', 'A', 'B')`);
      await assert.rejects(run(db, files[upTo]!), /users_email_unique/);
    } finally {
      await db.close();
    }
  });
});
