/** docs/API.md, section 4: register, login, logout, forgot and reset password. */
import { Hono } from 'hono';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { passwordResets, users } from '../../db/schema.ts';
import { hashPassword, needsRehash, newId, newToken, passwordProblem, sha256, timingDummyHash, verifyPassword } from '../../lib/crypto.ts';
import { sendInBackground } from '../../lib/email.ts';
import { ApiError } from '../../lib/errors.ts';
import { tooManyAttempts } from '../../lib/rateLimit.ts';
import { fields, readBody } from '../../lib/validate.ts';
import type { AppEnv, Deps } from '../../types.ts';
import { authenticate, createSession, revokeSession, revokeUserSessions, toPublicUser } from './sessions.ts';
import { cancelResetLinks, notifyPasswordChanged } from './security.ts';
import { sendVerification } from './verification.ts';

const RESET_TTL_MS = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/**
 * Failed sign-ins allowed per email per window, on top of the per-IP limit. Spreading guesses over many
 * IPs doesn't help an attacker, because this counts per account. Applied to every email, existing or not,
 * so the limit itself doesn't reveal which emails have accounts.
 */
const LOGIN_FAILURES_PER_EMAIL = 10;
const LOGIN_FAILURE_WINDOW_MS = 15 * MINUTE;

export const newPassword = () =>
  z
    .string({ error: 'Create a password' })
    .max(200)
    .superRefine((value, ctx) => {
      const problem = passwordProblem(value);
      if (problem) ctx.addIssue({ code: 'custom', message: problem });
    });

const registerBody = z.object({
  firstName: fields.name('first name'),
  lastName: fields.name('last name'),
  email: fields.email(),
  password: newPassword(),
  marketing: z.boolean().optional().default(false),
});

const loginBody = z.object({
  email: fields.email(),
  password: z.string({ error: 'Enter your password' }).min(1, 'Enter your password').max(200),
});

const emailTaken = () => new ApiError(409, 'email_taken', 'An account with this email already exists.');
const invalidCredentials = () =>
  new ApiError(401, 'invalid_credentials', 'That email and password don’t match our records. Check them and try again.');

export function authRoutes(deps: Deps) {
  const { db, mailer, appUrl, rateLimit, limiter } = deps;
  const app = new Hono<AppEnv>();

  app.post('/auth/register', rateLimit('register', 5, MINUTE), async (c) => {
    const body = await readBody(c, registerBody);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
    if (existing) throw emailTaken();
    const [user] = await db
      .insert(users)
      .values({
        id: newId('u-', 12),
        email: body.email,
        passwordHash: await hashPassword(body.password),
        firstName: body.firstName,
        lastName: body.lastName,
        marketing: body.marketing,
      })
      .onConflictDoNothing({ target: users.email }) // two registrations racing for the same email
      .returning();
    if (!user) throw emailTaken();
    const token = await createSession(db, user.id);
    await sendVerification(deps, db, user);
    return c.json({ user: toPublicUser(user), token }, 201);
  });

  app.post('/auth/login', rateLimit('login', 10, MINUTE), async (c) => {
    const body = await readBody(c, loginBody);
    const failuresKey = `login-failures:${body.email}`;
    if ((await limiter.count(failuresKey)) >= LOGIN_FAILURES_PER_EMAIL) {
      throw tooManyAttempts('Too many sign-in attempts for this account. Wait 15 minutes, or reset your password.');
    }
    const [user] = await db.select().from(users).where(and(eq(users.email, body.email), isNull(users.deletedAt))).limit(1);
    // Check a password even when there's no account, so response times don't reveal which emails exist.
    const valid = await verifyPassword(body.password, user?.passwordHash ?? (await timingDummyHash()));
    if (!user || !valid) {
      await limiter.hit(failuresKey, LOGIN_FAILURE_WINDOW_MS);
      throw invalidCredentials();
    }
    // The only moment the plain password is available: upgrade a hash made with older settings.
    if (needsRehash(user.passwordHash)) {
      await db.update(users).set({ passwordHash: await hashPassword(body.password) }).where(eq(users.id, user.id));
    }
    const token = await createSession(db, user.id);
    return c.json({ user: toPublicUser(user), token });
  });

  // Never 401: signing out with an expired token must not make the storefront say "your session has ended".
  app.post('/auth/logout', async (c) => {
    const auth = await authenticate(db, c);
    if (auth) await revokeSession(db, auth.sessionId);
    return c.body(null, 204);
  });

  // Always answers the same way, so this form can't be used to find out which emails have accounts.
  app.post('/auth/forgot-password', rateLimit('forgot-password', 5, 15 * MINUTE), async (c) => {
    const { email } = await readBody(c, z.object({ email: fields.email() }));
    const [user] = await db.select().from(users).where(and(eq(users.email, email), isNull(users.deletedAt))).limit(1);
    if (user) {
      const token = newToken();
      await db.insert(passwordResets).values({ tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) });
      sendInBackground(mailer, {
        to: user.email,
        subject: 'Reset your NOVA password',
        text: [
          `Hi ${user.firstName},`,
          '',
          'Use this link to choose a new password. It works once and expires in 1 hour:',
          `${appUrl}/reset-password?token=${token}`,
          '',
          'If you didn’t ask for this, you can ignore this email. Your password won’t change.',
        ].join('\n'),
      });
    }
    return c.json({ sent: true }, 202);
  });

  app.post('/auth/reset-password', rateLimit('reset-password', 10, 15 * MINUTE), async (c) => {
    const body = await readBody(c, z.object({ token: z.string().min(1).max(200), password: newPassword() }));
    const passwordHash = await hashPassword(body.password);
    const reset = await db.transaction(async (tx) => {
      // Marking the token used in the same statement that checks it means it can only ever work once.
      const [row] = await tx
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResets.tokenHash, sha256(body.token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
        .returning({ userId: passwordResets.userId });
      if (!row) return null;
      const [user] = await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(and(eq(users.id, row.userId), isNull(users.deletedAt)))
        .returning({ id: users.id, email: users.email, firstName: users.firstName });
      if (!user) return null;
      await revokeUserSessions(tx, user.id); // anyone signed in with the old password is signed out
      await cancelResetLinks(tx, user.id); // and any other link sent earlier stops working
      return user;
    });
    if (!reset) throw new ApiError(400, 'invalid_token', 'This reset link is invalid or has expired. Request a new one to continue.');
    notifyPasswordChanged(deps, reset, 'reset');
    return c.json({ reset: true });
  });

  return app;
}
