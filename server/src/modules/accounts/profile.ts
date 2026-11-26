/** docs/API.md, section 5: update profile, change password, delete account. */
import { Hono } from 'hono';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { addresses, newsletterSubscribers, orders, passwordResets, users } from '../../db/schema.ts';
import { hashPassword, newToken, verifyPassword } from '../../lib/crypto.ts';
import { ApiError } from '../../lib/errors.ts';
import { fields, readBody } from '../../lib/validate.ts';
import type { AppEnv, Deps } from '../../types.ts';
import { newPassword } from './auth.ts';
import { requireAuth, revokeUserSessions, toPublicUser } from './sessions.ts';

const profileBody = z.object({
  firstName: fields.name('first name').optional(),
  lastName: fields.name('last name').optional(),
  email: fields.email().optional(),
  marketing: z.boolean().optional(),
});

const passwordBody = z.object({
  currentPassword: z.string({ error: 'Enter your current password' }).min(1, 'Enter your current password').max(200),
  newPassword: newPassword(),
});

export function profileRoutes(deps: Deps) {
  const { db } = deps;
  const app = new Hono<AppEnv>();
  app.use('/me', requireAuth(deps));
  app.use('/me/password', requireAuth(deps));

  app.patch('/me', async (c) => {
    const user = c.get('user');
    const patch = await readBody(c, profileBody);
    if (patch.email && patch.email !== user.email) {
      // v1 changes the email straight away. v1.1 should confirm the new address first (docs/API.md).
      const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, patch.email), ne(users.id, user.id))).limit(1);
      if (taken) throw new ApiError(409, 'email_taken', 'Another account already uses this email.');
    }
    const changes = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    if (patch.email && patch.email !== user.email) Object.assign(changes, { emailVerifiedAt: null });
    const [updated] = await db
      .update(users)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
    return c.json(toPublicUser(updated!));
  });

  app.post('/me/password', async (c) => {
    const user = c.get('user');
    const body = await readBody(c, passwordBody);
    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw new ApiError(400, 'wrong_password', 'Your current password is incorrect.');
    }
    await db.update(users).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
    await revokeUserSessions(db, user.id, c.get('sessionId')); // other devices are signed out; this one stays in
    return c.json({ changed: true });
  });

  /**
   * Deletes what's personal and not needed; anonymises what accounting needs (orders).
   * See docs/DATA_MODEL.md, "Rules that span tables", item 5.
   */
  app.delete('/me', async (c) => {
    const user = c.get('user');
    const placeholderEmail = `deleted+${user.id}@nova.invalid`;
    await db.transaction(async (tx) => {
      await revokeUserSessions(tx, user.id);
      await tx.delete(addresses).where(eq(addresses.userId, user.id));
      await tx.delete(passwordResets).where(eq(passwordResets.userId, user.id));
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
