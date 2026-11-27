/** Spending limits on email (src/lib/email.ts, withSendingLimits) and 429 answers that say how long to wait. */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../src/lib/logger.ts';
import { testApi } from './helpers.ts';

type Line = Record<string, any>;
const lines: Line[] = [];
const logger = createLogger({ level: 'debug', json: true, write: (line) => lines.push(JSON.parse(line)) });
const settle = () => new Promise((resolve) => setTimeout(resolve, 50)); // emails are sent in the background

let api: Awaited<ReturnType<typeof testApi>>;
before(async () => (api = await testApi({ rateLimits: true, trustProxyHops: 1, logger, emailLimits: { perRecipientPerHour: 3, perDay: 11 } })));
after(() => api.close());

const fromIp = (ip: string) => ({ 'X-Forwarded-For': ip });
let ipCounter = 0;
/** Registers from a fresh IP each time, so the per-IP registration limit doesn't get in the way. */
async function register(email: string) {
  const res = await api.call('POST', '/auth/register', {
    body: { firstName: 'Test', lastName: 'User', email, password: 'Password2026', marketing: false },
    headers: fromIp(`10.0.0.${++ipCounter}`),
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { token: res.body.token as string, user: res.body.user, password: 'Password2026' };
}
const outboxTo = (address: string) => (api.mailer as unknown as { outbox: { to: string }[] }).outbox.filter((email) => email.to === address);

describe('email limits', () => {
  it('caps emails to one address, however many IPs ask, and answers the same way regardless', async () => {
    const { user } = await register('flood-target@example.com');
    await settle();
    const before = outboxTo(user.email).length; // the verification email
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await api.call('POST', '/auth/forgot-password', { body: { email: user.email }, headers: fromIp(`198.51.100.${i}`) })).status);
    }
    await settle();
    assert.deepEqual([...new Set(statuses)], [202], 'every request gets the usual answer');
    assert.equal(outboxTo(user.email).length, 3, `3 an hour in total (${before} verification + ${3 - before} resets)`);
    assert.ok(lines.some((line) => line.msg === 'Email not sent: too many to this address this hour' && line.to === 'f**@example.com'));
  });

  it('never caps our own support inbox', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await api.call('POST', '/support/messages', {
        body: { name: 'Ada', email: `ada${i}@example.com`, topic: 'Delivery', message: 'Where is my order? It has been a week now.' },
        headers: fromIp(`203.0.113.${i}`),
      });
      assert.equal(res.status, 201);
    }
    await settle();
    assert.equal(outboxTo('support@nova.test').length, 5);
  });

  it('stops sending at the daily ceiling, warning at 80% first and logging every email it drops', async () => {
    // So far today: 3 to the flood target, 5 to support. The ceiling is 11, so the 9th is 80%.
    lines.length = 0;
    for (let i = 0; i < 4; i++) {
      await register(`daily${i}@example.com`); // each sends a verification email
      await settle();
    }
    const sentToday = (api.mailer as unknown as { outbox: unknown[] }).outbox.length;
    assert.equal(sentToday, 11, 'nothing past the ceiling');
    assert.equal(lines.filter((line) => line.msg === 'Emails today have reached 80% of the daily limit').length, 1);
    const dropped = lines.filter((line) => line.msg === 'Email not sent: daily email limit reached');
    assert.ok(dropped.length >= 1 && dropped.every((line) => line.level === 'error'));
  });
});

describe('429 answers', () => {
  it('say how long to wait, in the message, the body and the Retry-After header', async () => {
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) {
      last = await api.app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...fromIp('198.51.100.200') },
        body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password' }),
      });
    }
    assert.equal(last!.status, 429);
    const body = await last!.json();
    const retryAfter = Number(last!.headers.get('retry-after'));
    assert.equal(body.retryAfter, retryAfter);
    assert.ok(retryAfter >= 1 && retryAfter <= 60);
    assert.match(body.message, /^Too many attempts\. Please try again in \d+ seconds?\.$/);
  });

  it('limit email and password changes per account, since each one sends email', async () => {
    const { token, password } = await register('changer@example.com');
    const statuses: number[] = [];
    let current = password;
    for (let i = 0; i < 6; i++) {
      const next = `NewPassword${i}x`;
      const res = await api.call('POST', '/me/password', { token, body: { currentPassword: current, newPassword: next }, headers: fromIp(`198.51.100.${50 + i}`) });
      statuses.push(res.status);
      if (res.status === 200) current = next;
      else assert.match(res.body.message, /changed your password several times recently\. Please try again in \d+ minutes?\./);
    }
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  });
});
