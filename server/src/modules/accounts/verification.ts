/**
 * Email verification (docs/API.md, section 4). A link is sent when an account is created and when its
 * email changes. Until it's used, the account works normally, but guest orders placed with that email
 * aren't linked to it: that needs proof the address belongs to the account holder.
 */
import { Hono } from 'hono';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.ts';
import { emailVerifications, users } from '../../db/schema.ts';
import { newToken, sha256 } from '../../lib/crypto.ts';
import { sendInBackground } from '../../lib/email.ts';
import { ApiError } from '../../lib/errors.ts';
import { tooManyAttempts } from '../../lib/rateLimit.ts';
import { readBody } from '../../lib/validate.ts';
import type { AppEnv, Deps } from '../../types.ts';
import { requireAuth } from './sessions.ts';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const RESENDS_PER_ACCOUNT = 3; // per 15 minutes, so the button can't be used to flood someone's inbox

/** Creates a verification link for the account's current email and sends it. */
export async function sendVerification(deps: Pick<Deps, 'mailer' | 'appUrl'>, db: Db, user: { id: string; email: string; firstName: string }) {
  const token = newToken();
  await db.insert(emailVerifications).values({
    tokenHash: sha256(token),
    userId: user.id,
    email: user.email,
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
  });
  sendInBackground(deps.mailer, {
    to: user.email,
    subject: 'Confirm your email for NOVA',
    text: [
      `Hi ${user.firstName},`,
      '',
      'Confirm this is your email address. The link works once and expires in 24 hours:',
      `${deps.appUrl}/verify-email?token=${token}`,
      '',
      'If you didn’t create a NOVA account, you can ignore this email.',
    ].join('\n'),
  });
}

const invalidLink = () =>
  new ApiError(400, 'invalid_token', 'This confirmation link is invalid or has expired. You can send a new one from your account.');

export function verificationRoutes(deps: Deps) {
  const { db, rateLimit, limiter } = deps;
  const app = new Hono<AppEnv>();

  // Works without being signed in: the link is opened from the inbox, often on another device.
  app.post('/auth/verify-email', rateLimit('verify-email', 10, 15 * MINUTE), async (c) => {
    const { token } = await readBody(c, z.object({ token: z.string().min(1).max(200) }));
    const verified = await db.transaction(async (tx) => {
      // Checking and using the link in one statement means it works once.
      const [link] = await tx
        .update(emailVerifications)
        .set({ usedAt: new Date() })
        .where(and(eq(emailVerifications.tokenHash, sha256(token)), isNull(emailVerifications.usedAt), gt(emailVerifications.expiresAt, new Date())))
        .returning({ userId: emailVerifications.userId, email: emailVerifications.email });
      if (!link) return null;
      // Only if the account still has the address the link was sent to.
      const [user] = await tx
        .update(users)
        .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(users.id, link.userId), eq(users.email, link.email), isNull(users.deletedAt)))
        .returning();
      return user ?? null;
    });
    if (!verified) throw invalidLink();
    return c.json({ verified: true, email: verified.email });
  });

  app.post('/me/email-verification', requireAuth(deps), rateLimit('verify-resend', 10, 15 * MINUTE), async (c) => {
    const user = c.get('user');
    if (user.emailVerifiedAt) return c.json({ sent: false, alreadyVerified: true });
    const key = `verify-resend:${user.id}`;
    if ((await limiter.count(key)) >= RESENDS_PER_ACCOUNT) {
      throw tooManyAttempts('We’ve sent a few links already. Check your inbox and spam folder, or try again in 15 minutes.');
    }
    await limiter.hit(key, 15 * MINUTE);
    await sendVerification(deps, db, user);
    return c.json({ sent: true, alreadyVerified: false }, 202);
  });

  return app;
}
