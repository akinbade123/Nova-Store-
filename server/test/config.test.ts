/** Production settings the API refuses to start with (src/env.ts). */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { databaseUrlProblem, productionProblems } from '../src/env.ts';

const safe = {
  DATABASE_URL: 'postgres://nova_api:x@db.example.com:5432/nova?sslmode=verify-full',
  DATABASE_MIGRATION_URL: 'postgres://owner:x@db.example.com:5432/nova?sslmode=verify-full',
  APP_URL: 'https://shop.example.com',
  SUPPORT_EMAIL: 'support@example.com',
};

describe('production settings', () => {
  it('accepts an encrypted, verified database connection and HTTPS links', () => {
    assert.deepEqual(productionProblems(safe), []);
  });

  it('refuses a database connection that isn’t encrypted and verified', () => {
    for (const query of ['', '?sslmode=disable', '?sslmode=prefer', '?sslmode=require', '?sslmode=no-verify']) {
      assert.match(databaseUrlProblem('DATABASE_URL', `postgres://u:p@db.example.com/nova${query}`) ?? '', /sslmode=verify-full/, query || 'no sslmode');
    }
    assert.equal(productionProblems({ ...safe, DATABASE_MIGRATION_URL: 'postgres://o:p@db.example.com/nova' }).length, 1, 'the owner’s URL too');
  });

  it('allows a database on the same machine without TLS', () => {
    assert.equal(databaseUrlProblem('DATABASE_URL', 'postgres://u:p@localhost:5432/nova'), null);
    assert.equal(databaseUrlProblem('DATABASE_URL', 'postgres://u:p@127.0.0.1/nova'), null);
  });

  it('refuses email links that aren’t HTTPS, and lists every problem at once', () => {
    const problems = productionProblems({ DATABASE_URL: 'postgres://u:p@db.example.com/nova', APP_URL: 'http://shop.example.com' });
    assert.equal(problems.length, 3);
    assert.match(problems.join('\n'), /APP_URL must start with https/);
    assert.match(problems.join('\n'), /SUPPORT_EMAIL is required/);
  });
});
