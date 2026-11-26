/** docs/API.md, section 9: promo code preview, newsletter, support messages. */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { newsletterSubscribers, promotions, supportMessages } from '../../db/schema.ts';
import { sendInBackground } from '../../lib/email.ts';
import { ApiError } from '../../lib/errors.ts';
import { toCents, toDollars } from '../../lib/money.ts';
import { fields, readBody } from '../../lib/validate.ts';
import type { AppEnv, Deps } from '../../types.ts';
import { authenticate } from '../accounts/sessions.ts';

const MINUTE = 60 * 1000;

/** Same list as TOPICS in src/pages/HelpPage.jsx. */
export const SUPPORT_TOPICS = [
  'An order I’ve placed',
  'Returns or refunds',
  'Delivery',
  'Payment or promo codes',
  'My account',
  'Product question',
  'Something else',
] as const;

type PromotionRow = typeof promotions.$inferSelect;

/** docs/API.md, "Promotion". */
export const toPromotion = (row: PromotionRow) => ({
  code: row.code,
  type: row.type,
  value: row.value,
  label: row.label,
  minSubtotal: toDollars(row.minSubtotalCents),
});

/** Whether a promotion can be used right now, ignoring the minimum spend. */
export const isRedeemable = (row: PromotionRow, now = new Date()) =>
  row.active &&
  (!row.startsAt || row.startsAt <= now) &&
  (!row.endsAt || row.endsAt > now) &&
  (row.maxRedemptions == null || row.redemptions < row.maxRedemptions);

const supportBody = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(100),
  email: fields.email(),
  order: fields.optionalText(40),
  topic: z.enum(SUPPORT_TOPICS, { error: 'Choose what your message is about' }),
  message: z.string().trim().min(20, 'Tell us a little more — at least 20 characters').max(5000),
});

export function engagementRoutes(deps: Deps) {
  const { db, mailer, supportEmail, rateLimit } = deps;
  const app = new Hono<AppEnv>();

  // A preview only: the promo is applied again, from the database, when the order is quoted and placed.
  app.post('/cart/promo', rateLimit('promo', 20, MINUTE), async (c) => {
    const body = await readBody(
      c,
      z.object({
        code: z.string({ error: 'Please enter a promo code.' }).trim().toUpperCase().min(1, 'Please enter a promo code.').max(40),
        subtotal: z.number().min(0),
      }),
    );
    const [promo] = await db.select().from(promotions).where(eq(promotions.code, body.code)).limit(1);
    if (!promo || !isRedeemable(promo)) {
      throw new ApiError(404, 'invalid_promo', `“${body.code}” isn’t a valid code. Check the spelling and try again.`);
    }
    if (toCents(body.subtotal) < promo.minSubtotalCents) {
      throw new ApiError(
        422,
        'promo_min_subtotal',
        `${promo.code} applies to orders over $${toDollars(promo.minSubtotalCents)}. Add a little more to use it.`,
      );
    }
    return c.json(toPromotion(promo));
  });

  // Subscribing twice isn't an error, and re-subscribing after unsubscribing works.
  app.post('/newsletter', rateLimit('newsletter', 5, MINUTE), async (c) => {
    const { email } = await readBody(c, z.object({ email: fields.email() }));
    await db
      .insert(newsletterSubscribers)
      .values({ email, source: 'footer' })
      .onConflictDoUpdate({ target: newsletterSubscribers.email, set: { unsubscribedAt: null } });
    return c.json({ email, subscribed: true });
  });

  app.post('/support/messages', rateLimit('support', 5, 10 * MINUTE), async (c) => {
    const body = await readBody(c, supportBody);
    const auth = await authenticate(db, c); // optional: links the message to the account when signed in
    const ticket = `SUP-${Math.floor(100000 + Math.random() * 900000)}`;
    await db.insert(supportMessages).values({
      ticket,
      userId: auth?.user.id ?? null,
      name: body.name,
      email: body.email,
      orderId: body.order,
      topic: body.topic,
      message: body.message,
    });
    sendInBackground(mailer, {
      to: supportEmail,
      subject: `[${ticket}] ${body.topic}`,
      text: [`From: ${body.name} <${body.email}>`, body.order ? `Order: ${body.order}` : null, '', body.message].filter((line) => line !== null).join('\n'),
    });
    return c.json({ ticket }, 201);
  });

  return app;
}
