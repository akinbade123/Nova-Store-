/**
 * What happens around account-security changes (docs/API.md, section 4): outstanding reset links are
 * cancelled, and the owner is told, so a change they didn't make doesn't go unnoticed.
 */
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { passwordResets } from '../../db/schema.ts';
import { type Mailer, sendInBackground } from '../../lib/email.ts';

/**
 * Cancels every unused password-reset link for a user. Called after a reset, a password change and an
 * email change, so a link that was requested earlier (perhaps by someone else) can't be used afterwards.
 */
export const cancelResetLinks = (db: Db, userId: string) =>
  db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)));

/** "ada@example.com" → "a**@example.com": enough to recognise, not enough to harvest. */
export const maskEmail = (email: string) => {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
};

type Context = { mailer: Mailer; appUrl: string; supportEmail: string };

const ifNotYou = ({ appUrl, supportEmail }: Context) =>
  `If this wasn't you, reset your password now at ${appUrl}/forgot-password and contact us at ${supportEmail}.`;

/** Sent after a password reset or change, to the account's email. */
export function notifyPasswordChanged(ctx: Context, user: { email: string; firstName: string }, how: 'reset' | 'changed') {
  sendInBackground(ctx.mailer, {
    to: user.email,
    subject: 'Your NOVA password was changed',
    text: [
      `Hi ${user.firstName},`,
      '',
      how === 'reset'
        ? 'Your password was just reset using a link sent to this address. You’ve been signed out on every device.'
        : 'Your password was just changed from your account settings. Your other devices have been signed out.',
      '',
      ifNotYou(ctx),
    ].join('\n'),
  });
}

/** Sent to the OLD address when the account's email changes, so the owner hears about it even if it wasn't them. */
export function notifyEmailChanged(ctx: Context, user: { firstName: string }, oldEmail: string, newEmail: string) {
  sendInBackground(ctx.mailer, {
    to: oldEmail,
    subject: 'Your NOVA email address was changed',
    text: [
      `Hi ${user.firstName},`,
      '',
      `The email address on your NOVA account was just changed to ${maskEmail(newEmail)}. Receipts and password resets will go there from now on.`,
      '',
      `If this wasn't you, contact us at ${ctx.supportEmail} straight away so we can secure your account.`,
    ].join('\n'),
  });
}
