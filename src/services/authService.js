import { api, mockDelay, USE_MOCK_DATA } from './api';

/*
 * Sample-data authentication. Accounts live in this browser's localStorage so the
 * flows can be exercised end to end before the backend exists. Passwords are stored
 * as SHA-256 hashes, never plain text. Replace with real API calls via USE_MOCK_DATA=false.
 */

const USERS_KEY = 'nova:users';

const reject = (code, message) => Promise.reject(Object.assign(new Error(message), { code, userMessage: message }));

async function hashPassword(password) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`nova:${password}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readUsers() {
  let users = [];
  try {
    users = JSON.parse(localStorage.getItem(USERS_KEY)) ?? [];
  } catch {
    users = [];
  }
  const { DEMO_ACCOUNT } = await import('./mock/demoAccount.js');
  if (!users.some((user) => user.email === DEMO_ACCOUNT.email)) {
    users.push({
      id: 'u-demo',
      firstName: 'Ada',
      lastName: 'Okafor',
      email: DEMO_ACCOUNT.email,
      passwordHash: await hashPassword(DEMO_ACCOUNT.password),
      marketing: true,
      createdAt: '2025-03-14T10:00:00.000Z',
    });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  return users;
}

const writeUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

/* Sample-data password resets: token -> { email, expiresAt }. Links expire after 1 hour, as the email says. */
const RESETS_KEY = 'nova:password-resets';
const RESET_TTL_MS = 60 * 60 * 1000;
const readResets = () => {
  try {
    return JSON.parse(localStorage.getItem(RESETS_KEY)) ?? {};
  } catch {
    return {};
  }
};

const toPublicUser =({ passwordHash, ...user }) => user;
const newToken = () => `mock.${crypto.randomUUID()}`;

export const authService = {
  async signIn({ email, password }) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.post('/auth/login', { email, password });
      return data; // { user, token }
    }
    await mockDelay(null, 900);
    const users = await readUsers();
    const user = users.find((item) => item.email === email.trim().toLowerCase());
    if (!user || user.passwordHash !== (await hashPassword(password))) {
      return reject('invalid_credentials', 'That email and password don’t match our records. Check them and try again.');
    }
    return { user: toPublicUser(user), token: newToken() };
  },

  async register({ firstName, lastName, email, password, marketing }) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.post('/auth/register', { firstName, lastName, email, password, marketing });
      return data;
    }
    await mockDelay(null, 1000);
    const users = await readUsers();
    const normalised = email.trim().toLowerCase();
    if (users.some((item) => item.email === normalised)) {
      return reject('email_taken', 'An account with this email already exists.');
    }
    const user = {
      id: `u-${crypto.randomUUID().slice(0, 8)}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalised,
      passwordHash: await hashPassword(password),
      marketing,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
    return { user: toPublicUser(user), token: newToken() };
  },

  /**
   * Always resolves the same way, so the form never reveals which emails have accounts.
   * Sample-data mode sends no email, so it also returns `devResetPath`: the link the email would contain.
   */
  async requestPasswordReset(email) {
    if (!USE_MOCK_DATA) {
      await api.post('/auth/forgot-password', { email });
      return { sent: true };
    }
    await mockDelay(null, 900);
    const token = crypto.randomUUID();
    const resets = readResets();
    resets[token] = { email: email.trim().toLowerCase(), expiresAt: Date.now() + RESET_TTL_MS };
    localStorage.setItem(RESETS_KEY, JSON.stringify(resets));
    return { sent: true, devResetPath: `/reset-password?token=${token}` };
  },

  /** Sets a new password using the token from the reset email. The token works once. */
  async resetPassword({ token, password }) {
    if (!USE_MOCK_DATA) {
      await api.post('/auth/reset-password', { token, password });
      return { reset: true };
    }
    await mockDelay(null, 900);
    const resets = readResets();
    const entry = resets[token];
    const users = await readUsers();
    const user = entry && entry.expiresAt > Date.now() ? users.find((item) => item.email === entry.email) : null;
    if (!user) {
      return reject('invalid_token', 'This reset link is invalid or has expired. Request a new one to continue.');
    }
    const passwordHash = await hashPassword(password);
    writeUsers(users.map((item) => (item.id === user.id ? { ...item, passwordHash } : item)));
    delete resets[token];
    localStorage.setItem(RESETS_KEY, JSON.stringify(resets));
    return { reset: true };
  },

  async signOut() {
    if (!USE_MOCK_DATA) await api.post('/auth/logout').catch(() => {});
  },

  /** `currentPassword` is required when the email changes (docs/API.md, PATCH /me). */
  async updateProfile(userId, { currentPassword, ...patch }) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.patch('/me', currentPassword ? { ...patch, currentPassword } : patch);
      return data;
    }
    await mockDelay(null, 700);
    const users = await readUsers();
    const email = patch.email?.trim().toLowerCase();
    const current = users.find((item) => item.id === userId);
    if (email && current && email !== current.email) {
      if (!currentPassword) return reject('validation_failed', 'Enter your current password to change your email');
      if (current.passwordHash !== (await hashPassword(currentPassword))) {
        return reject('wrong_password', 'Your current password is incorrect.');
      }
    }
    if (email && users.some((item) => item.email === email && item.id !== userId)) {
      return reject('email_taken', 'Another account already uses this email.');
    }
    const next = users.map((item) =>
      item.id === userId
        ? {
            ...item,
            ...patch,
            ...(email ? { email } : {}),
            ...(patch.firstName ? { firstName: patch.firstName.trim() } : {}),
            ...(patch.lastName ? { lastName: patch.lastName.trim() } : {}),
          }
        : item,
    );
    writeUsers(next);
    const updated = next.find((item) => item.id === userId);
    if (!updated) return reject('not_found', 'We couldn’t find your account. Please sign in again.');
    return toPublicUser(updated);
  },

  async changePassword(userId, currentPassword, newPassword) {
    if (!USE_MOCK_DATA) {
      await api.post('/me/password', { currentPassword, newPassword });
      return { changed: true };
    }
    await mockDelay(null, 900);
    const users = await readUsers();
    const user = users.find((item) => item.id === userId);
    if (!user || user.passwordHash !== (await hashPassword(currentPassword))) {
      return reject('wrong_password', 'Your current password is incorrect.');
    }
    const passwordHash = await hashPassword(newPassword);
    writeUsers(users.map((item) => (item.id === userId ? { ...item, passwordHash } : item)));
    return { changed: true };
  },

  async deleteAccount(userId, password) {
    if (!USE_MOCK_DATA) {
      await api.delete('/me', { data: { password } });
      return { deleted: true };
    }
    await mockDelay(null, 900);
    const users = await readUsers();
    const user = users.find((item) => item.id === userId);
    if (!user || user.passwordHash !== (await hashPassword(password ?? ''))) {
      return reject('wrong_password', 'Your current password is incorrect.');
    }
    writeUsers(users.filter((item) => item.id !== userId));
    localStorage.removeItem(`nova:addresses:${userId}`);
    return { deleted: true };
  },
};
