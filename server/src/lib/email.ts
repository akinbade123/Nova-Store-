import { logger } from './logger.ts';

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
