/**
 * Deletes what's no longer any use: ended sessions and spent or expired links. Ended sessions can't sign
 * anyone in, but keeping them grows the tables (and the backups) forever. Run at startup and every
 * few hours by src/index.ts.
 */
import { isNotNull, lt, or } from 'drizzle-orm';
import type { Db } from './client.ts';
import { emailVerifications, passwordResets, sessions } from './schema.ts';
import { MAX_SESSION_DAYS } from '../modules/accounts/sessions.ts';

export async function purgeExpired(db: Db, now = new Date()) {
  const oldestAllowedSession = new Date(now.getTime() - MAX_SESSION_DAYS * 24 * 60 * 60 * 1000);
  const ended = await db
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, now), isNotNull(sessions.revokedAt), lt(sessions.createdAt, oldestAllowedSession)))
    .returning({ id: sessions.id });
  const resets = await db
    .delete(passwordResets)
    .where(or(lt(passwordResets.expiresAt, now), isNotNull(passwordResets.usedAt)))
    .returning({ id: passwordResets.tokenHash });
  const verifications = await db
    .delete(emailVerifications)
    .where(or(lt(emailVerifications.expiresAt, now), isNotNull(emailVerifications.usedAt)))
    .returning({ id: emailVerifications.tokenHash });
  return { sessions: ended.length, passwordResets: resets.length, emailVerifications: verifications.length };
}
