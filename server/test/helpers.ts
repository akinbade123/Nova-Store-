import { createApp } from '../src/app.ts';
import { createDb } from '../src/db/client.ts';
import { seed, DEMO_ACCOUNT } from '../src/db/seed.ts';
import { createConsoleMailer } from '../src/lib/email.ts';

export { DEMO_ACCOUNT };

/** A fresh API on an in-memory database with migrations applied and the sample data loaded. */
export async function testApi({ rateLimits = false, trustProxyHops = 0 } = {}) {
  const database = await createDb();
  await database.migrate();
  await seed(database.db, { demoAccount: true });
  const mailer = createConsoleMailer({ quiet: true });
  const app = createApp({ db: database.db, mailer, appUrl: 'https://nova.test', supportEmail: 'support@nova.test', rateLimits, trustProxyHops });

  /** Calls the API in-process. Returns the status and parsed JSON body (null for empty responses). */
  async function call(
    method: string,
    path: string,
    { body, token, headers: extra }: { body?: unknown; token?: string; headers?: Record<string, string> } = {},
  ) {
    const headers: Record<string, string> = { ...extra };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await app.request(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  async function signIn(email = DEMO_ACCOUNT.email, password = DEMO_ACCOUNT.password) {
    const res = await call('POST', '/auth/login', { body: { email, password } });
    if (res.status !== 200) throw new Error(`sign-in failed: ${JSON.stringify(res.body)}`);
    return res.body.token as string;
  }

  let counter = 0;
  async function register(overrides: Record<string, unknown> = {}) {
    counter += 1;
    const body = { firstName: 'Test', lastName: 'User', email: `user${counter}@example.com`, password: 'Password2026', marketing: false, ...overrides };
    const res = await call('POST', '/auth/register', { body });
    if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
    return { token: res.body.token as string, user: res.body.user, password: body.password as string };
  }

  return { app, db: database.db, mailer, call, signIn, register, close: database.close };
}
