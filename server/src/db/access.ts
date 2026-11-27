/**
 * Who a database transaction acts for, for the row-level policies in drizzle/0005_row_level_security.sql.
 * The settings are transaction-local, so they can never leak to the next request that reuses the
 * connection. Queries outside withAccess see no private rows at all.
 */
import { sql } from 'drizzle-orm';
import type { Db } from './client.ts';

export type Access = {
  /** The signed-in user (or the account a reset or verification link belongs to). */
  userId?: string | null;
  /** The user's email, only if verified: guest orders placed with it are theirs. */
  verifiedEmail?: string | null;
  /** SHA-256 of a guest order's access token. */
  orderTokenHash?: string | null;
};

/** The access a signed-in user has. */
export const accessFor = (user: { id: string; email: string; emailVerifiedAt: Date | null }): Access => ({
  userId: user.id,
  verifiedEmail: user.emailVerifiedAt ? user.email : null,
});

/** Sets who the current transaction acts for. Call it again inside the transaction to change it. */
export async function setAccess(tx: Db, access: Access) {
  await tx.execute(sql`
    SELECT set_config('app.user_id', ${access.userId ?? ''}, true),
           set_config('app.user_email', ${access.verifiedEmail ?? ''}, true),
           set_config('app.order_token', ${access.orderTokenHash ?? ''}, true)
  `);
}

/** Runs `work` in a transaction acting for `access`. */
export function withAccess<T>(db: Db, access: Access, work: (tx: Db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await setAccess(tx as unknown as Db, access);
    return work(tx as unknown as Db);
  });
}
