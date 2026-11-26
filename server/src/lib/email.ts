export type Email = { to: string; subject: string; text: string };
export type Mailer = { send(email: Email): Promise<void> };

/**
 * Development mailer: prints each email to the console and keeps it in `outbox` (tests read it).
 * Replace with a transactional email provider (Resend, Postmark…) before launch: implement
 * `send` with their API and pass it to createApp in src/index.ts.
 */
export function createConsoleMailer({ quiet = false } = {}) {
  const outbox: Email[] = [];
  const mailer: Mailer & { outbox: Email[] } = {
    outbox,
    async send(email) {
      outbox.push(email);
      if (!quiet) console.log(`\n✉️  To: ${email.to}\n   Subject: ${email.subject}\n   ${email.text.replace(/\n/g, '\n   ')}\n`);
    },
  };
  return mailer;
}

/** Sends without making the request wait for the email provider. Failures are logged, not shown to the shopper. */
export function sendInBackground(mailer: Mailer, email: Email) {
  mailer.send(email).catch((error) => console.error('Email failed to send', { to: email.to, subject: email.subject, error }));
}
