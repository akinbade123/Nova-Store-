import type { Context, MiddlewareHandler } from 'hono';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { sessions, users } from '../../db/schema.ts';
import { newId, newToken, sha256 } from '../../lib/crypto.ts';
import { unauthorized } from '../../lib/errors.ts';
import type { AppEnv, Deps, UserRow } from '../../types.ts';

const SESSION_DAYS = 30;
const SLIDE_AFTER_MS = 60 * 60 * 1000; // extend a session at most once an hour, to limit writes
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/** Starts a session and returns the bearer token. The token itself is never stored, only its hash. */
export async function createSession(db: Db, userId: string) {
  const token = newToken();
  await db.insert(sessions).values({ id: newId('s-', 16), userId, tokenHash: sha256(token), expiresAt: daysFromNow(SESSION_DAYS) });
  return token;
}

export const revokeSession = (db: Db, sessionId: string) =>
  db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));

/** Revokes every session of a user, except `keepSessionId` if given. */
export const revokeUserSessions = (db: Db, userId: string, keepSessionId?: string) =>
  db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), keepSessionId ? ne(sessions.id, keepSessionId) : undefined));

const bearerToken = (c: Context) => {
  const header = c.req.header('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
};

/** The signed-in user and session for this request, or null. Expired, revoked and deleted don't count. */
export async function authenticate(db: Db, c: Context): Promise<{ user: UserRow; sessionId: string } | null> {
  const token = bearerToken(c);
  if (!token) return null;
  const [row] = await db
    .select({ user: users, session: { id: sessions.id, lastUsedAt: sessions.lastUsedAt } })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()), isNull(users.deletedAt)))
    .limit(1);
  if (!row) return null;
  if (Date.now() - row.session.lastUsedAt.getTime() > SLIDE_AFTER_MS) {
    await db.update(sessions).set({ lastUsedAt: new Date(), expiresAt: daysFromNow(SESSION_DAYS) }).where(eq(sessions.id, row.session.id));
  }
  return { user: row.user, sessionId: row.session.id };
}

/** Requires a valid session; otherwise 401 `unauthorized`. Sets `user` and `sessionId` on the context. */
export function requireAuth({ db }: Pick<Deps, 'db'>): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const auth = await authenticate(db, c);
    if (!auth) throw unauthorized();
    c.set('user', auth.user);
    c.set('sessionId', auth.sessionId);
    await next();
  };
}

/** The public user (docs/API.md, "User"). Never includes the password hash. */
export const toPublicUser = (user: UserRow) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  marketing: user.marketing,
  createdAt: user.createdAt.toISOString(),
});
