/** docs/API.md, section 5: update profile, change password, delete account. */
import { Hono } from 'hono';
import { accessFor, withAccess } from '../../db/access.ts';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { addresses, emailVerifications, newsletterSubscribers, orders, passwordResets, users } from '../../db/schema.ts';
import { hashPassword, newToken, verifyPassword } from '../../lib/crypto.ts';
import { ApiError } from '../../lib/errors.ts';
import { fields, readBody } from '../../lib/validate.ts';
import type { AppEnv, Deps, UserRow } from '../../types.ts';
import { newPassword } from './auth.ts';
import { requireAuth, revokeUserSessions, toPublicUser } from './sessions.ts';
import { cancelResetLinks, notifyEmailChanged, notifyPasswordChanged } from './security.ts';
import { sendVerification } from './verification.ts';

const profileBody = z.object({
  firstName: fields.name('first name').optional(),
  lastName: fields.name('last name').optional(),
  email: fields.email().optional(),
  marketing: z.boolean().optional(),
  /** Required only when `email` changes. */
  currentPassword: z.string().max(200).optional(),
});

const deleteBody = z.object({
  password: z.string({ error: 'Enter your password to confirm' }).min(1, 'Enter your password to confirm').max(200),
});

const wrongPassword = () => new ApiError(400, 'wrong_password', 'Your current password is incorrect.');

const passwordBody = z.object({
  currentPassword: z.string({ error: 'Enter your current password' }).min(1, 'Enter your current password').max(200),
  newPassword: newPassword(),
});

/**
 * For actions a stolen session mustn't be able to do. A missing password is a 422 on `field`;
 * a wrong one is 400 wrong_password, never 401, which would sign the storefront out.
 */
async function confirmPassword(user: UserRow, password: string | undefined, missingMessage: string, field = 'currentPassword') {
  if (!password) throw new ApiError(422, 'validation_failed', missingMessage, { fields: { [field]: missingMessage } });
  if (!(await verifyPassword(password, user.passwordHash))) throw wrongPassword();
}

export function profileRoutes(deps: Deps) {
  const { db } = deps;
  const app = new Hono<AppEnv>();
  app.use('/me', requireAuth(deps));
  app.use('/me/password', requireAuth(deps));

  // The signed-in user, so the storefront can refresh what it shows (for example after confirming the email).
  app.get('/me', (c) => c.json(toPublicUser(c.get('user'))));

  app.patch('/me', async (c) => {
    const user = c.get('user');
    const { currentPassword, ...patch } = await readBody(c, profileBody);
    if (patch.email && patch.email !== user.email) {
      // The email is where password resets go, so changing it needs the password: otherwise anyone with
      // a stolen session could point it at themselves and reset the password. Checked before email_taken,
      // so this can't be used to find out which emails have accounts.
      await confirmPassword(user, currentPassword, 'Enter your current password to change your email');
      // v1 changes the email straight away. v1.1 should confirm the new address first (docs/API.md).
      const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, patch.email), ne(users.id, user.id))).limit(1);
      if (taken) throw new ApiError(409, 'email_taken', 'Another account already uses this email.');
    }
    const changes = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    const emailChanged = Boolean(patch.email && patch.email !== user.email);
    if (emailChanged) Object.assign(changes, { emailVerifiedAt: null });
    const updated = await withAccess(db, accessFor(user), async (tx) => {
      const [row] = await tx
        .update(users)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      // Reset links were sent to the old address; they mustn't keep working once it's no longer the account's.
      if (emailChanged) await cancelResetLinks(tx, user.id);
      return row!;
    });
    if (emailChanged) {
      notifyEmailChanged(deps, user, user.email, updated.email);
      await sendVerification(deps, db, updated); // the new address needs confirming
    }
    return c.json(toPublicUser(updated));
  });

  app.post('/me/password', async (c) => {
    const user = c.get('user');
    const body = await readBody(c, passwordBody);
    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) throw wrongPassword();
    const passwordHash = await hashPassword(body.newPassword);
    await withAccess(db, accessFor(user), async (tx) => {
      await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
      await revokeUserSessions(tx, user.id, c.get('sessionId')); // other devices are signed out; this one stays in
      await cancelResetLinks(tx, user.id); // a reset link requested earlier (maybe by an intruder) stops working
    });
    notifyPasswordChanged(deps, user, 'changed');
    return c.json({ changed: true });
  });

  /**
   * Deletes what's personal and not needed; anonymises what accounting needs (orders).
   * See docs/DATA_MODEL.md, "Rules that span tables", item 5.
   */
  app.delete('/me', async (c) => {
    const user = c.get('user');
    const { password } = await readBody(c, deleteBody);
    await confirmPassword(user, password, 'Enter your password to confirm', 'password');
    // Lowercase like every stored email (a database check enforces it). Ids use only capitals and digits, so this stays unique.
    const placeholderEmail = `deleted+${user.id.toLowerCase()}@nova.invalid`;
    await withAccess(db, accessFor(user), async (tx) => {
      await revokeUserSessions(tx, user.id);
      await tx.delete(addresses).where(eq(addresses.userId, user.id));
      await tx.delete(passwordResets).where(eq(passwordResets.userId, user.id));
      await tx.delete(emailVerifications).where(eq(emailVerifications.userId, user.id));
      await tx.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, user.email));
      await tx
        .update(orders)
        .set({
          userId: null,
          email: placeholderEmail,
          phone: '',
          marketing: false,
          shippingAddress: { redacted: true },
          billingAddress: { redacted: true },
          updatedAt: new Date(),
        })
        .where(eq(orders.userId, user.id));
      await tx
        .update(users)
        .set({
          email: placeholderEmail,
          firstName: 'Deleted',
          lastName: 'user',
          passwordHash: `deleted$${newToken()}`, // can never match a password
          marketing: false,
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    });
    return c.json({ deleted: true });
  });

  return app;
}
