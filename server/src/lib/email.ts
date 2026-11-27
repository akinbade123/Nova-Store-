import { type Logger, logger } from './logger.ts';
import type { RateLimiter } from './rateLimit.ts';
import type { UsageMeter } from './usage.ts';

export type Email = { to: string; subject: string; text: string };
/** `name` says which provider sends the mail; the health check reports it. */
export type Mailer = { name: string; send(email: Email): Promise<void> };

/**
 * Development mailer: prints each email to the console and keeps it in `outbox` (tests read it).
 * Never for production: emails contain reset and confirmation links, and printing them puts working
 * links in the server logs. src/index.ts refuses to start in production without a real provider.
 */
export function createConsoleMailer({ quiet = false } = {}) {
  const outbox: Email[] = [];
  const mailer: Mailer & { outbox: Email[] } = {
    name: 'console',
    outbox,
    async send(email) {
      outbox.push(email);
      if (!quiet) console.log(`\n✉️  To: ${email.to}\n   Subject: ${email.subject}\n   ${email.text.replace(/\n/g, '\n   ')}\n`);
    },
  };
  return mailer;
}

/** "ada@example.com" → "a**@example.com": enough to identify in a log, without storing the address. */
const maskAddress = (address: string) => address.replace(/^(.)[^@]*/, (_, first: string) => `${first}**`);

export type EmailLimits = {
  /** Most emails to one address per hour, whatever triggered them. Default 5. */
  perRecipientPerHour: number;
  /** Most emails per UTC day across every instance. A warning is logged at 80%. Default 2000. */
  perDay: number;
  /** Addresses without the per-recipient cap: our own support inbox. */
  uncapped: string[];
};

const HOUR_MS = 60 * 60 * 1000;
const msUntilUtcMidnight = (now = new Date()) =>
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime();

/**
 * Wraps a mailer with spending limits, counted in the shared rate_limits table so every instance
 * agrees. Email is billed per message, and a form that sends email (forgot password, verification)
 * can be abused to flood someone's inbox at our expense, which also gets sending accounts suspended.
 * - Per recipient: past the hourly cap, emails to that address are dropped and logged. Callers
 *   still answer as if sent, so the cap reveals nothing about accounts.
 * - Per day: past the ceiling, nothing is sent and each drop is logged as an error, so it alerts.
 */
export function withSendingLimits(mailer: Mailer, limiter: RateLimiter, limits: EmailLimits, log: Logger = logger, usage?: UsageMeter): Mailer {
  const warnAt = Math.ceil(limits.perDay * 0.8);
  const uncapped = new Set(limits.uncapped.map((address) => address.toLowerCase()));
  return {
    name: mailer.name,
    async send(email) {
      const to = email.to.toLowerCase();
      if (!uncapped.has(to)) {
        const { count } = await limiter.take(`email-to:${to}`, HOUR_MS);
        if (count > limits.perRecipientPerHour) {
          log.warn('Email not sent: too many to this address this hour', { to: maskAddress(to), subject: email.subject, limit: limits.perRecipientPerHour });
          usage?.email('droppedPerAddress');
          return;
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      const { count: sentToday } = await limiter.take(`email-day:${today}`, msUntilUtcMidnight());
      if (sentToday > limits.perDay) {
        log.error('Email not sent: daily email limit reached', { to: maskAddress(to), subject: email.subject, limit: limits.perDay });
        usage?.email('droppedDaily');
        return;
      }
      if (sentToday === warnAt) log.warn('Emails today have reached 80% of the daily limit', { sent: sentToday, limit: limits.perDay });
      try {
        await mailer.send(email);
        usage?.email('sent');
      } catch (error) {
        usage?.email('failed');
        throw error;
      }
    },
  };
}

/** Sends without making the request wait for the email provider. Failures are logged, not shown to the shopper. */
export function sendInBackground(mailer: Mailer, email: Email) {
  mailer.send(email).catch((error) =>
    logger.error('Email failed to send', { provider: mailer.name, to: maskAddress(email.to), subject: email.subject, error }),
  );
}

/**
 * The mailer for production: a transactional email provider (Resend, Postmark, Amazon SES…).
 * Not connected yet. To connect one, return a Mailer whose `send` calls the provider's API with
 * `from: process.env.EMAIL_FROM` (an address on your own domain, set up with SPF and DKIM).
 */
export function createProductionMailer(): Mailer | null {
  return null;
}
