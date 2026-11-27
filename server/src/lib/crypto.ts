import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number, options: object) => Promise<Buffer>;

// ------------------------------------------------------------------ IDs and tokens

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, so IDs read clearly aloud

/** A random ID with a readable prefix: newId('NV-') -> "NV-8K2Q4D7M1X". Random, so it can't be guessed. */
export function newId(prefix: string, length = 10) {
  let id = prefix;
  for (let i = 0; i < length; i += 1) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}

/** A secret for sessions, password resets and guest order access. Only its hash is stored. */
export const newToken = () => randomBytes(32).toString('base64url');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

// ------------------------------------------------------------------ Passwords
// scrypt from Node's standard library: memory-hard, recommended by OWASP alongside argon2id and bcrypt,
// and no native dependency to install. The parameters are stored with each hash, so they can be raised:
// a hash made with weaker ones still verifies, and is upgraded at that user's next sign-in (needsRehash).
//
// N=2^15, r=8, p=3 is one of OWASP's equivalent minimum settings (Password Storage Cheat Sheet), as strong
// as N=2^17, p=1, but needing 32 MiB per hash instead of 128 MiB, so a burst of sign-ins can't exhaust a
// small server's memory. About 0.3 s per hash.

const N = 2 ** 15;
const R = 8;
const P = 3;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return timingSafeEqual(key, expected);
}

/** True when a stored hash was made with different (older) settings and should be replaced. */
export function needsRehash(stored: string) {
  const [scheme, n, r, p] = stored.split('$');
  return scheme !== 'scrypt' || Number(n) !== N || Number(r) !== R || Number(p) !== P;
}

/** Hash checked when the email doesn't exist, so a login takes the same time either way. */
let dummyHash: Promise<string> | undefined;
export const timingDummyHash = () => (dummyHash ??= hashPassword(newToken()));

/** Same rules as PASSWORD_RULES in the storefront (src/components/auth/PasswordStrength.jsx). */
export function passwordProblem(value: string) {
  if (value.length < 8) return 'Password needs: at least 8 characters';
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return 'Password needs: upper and lowercase letters';
  if (!/\d/.test(value)) return 'Password needs: at least one number';
  return null;
}
