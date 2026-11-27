# NOVA API

The backend for the NOVA storefront. It implements [docs/API.md](../docs/API.md) on the schema in [docs/DATA_MODEL.md](../docs/DATA_MODEL.md).

**Stack:** Node 22.18+ running TypeScript directly (no build step) · Hono · Drizzle ORM · PostgreSQL (PGlite for development and tests) · zod

## Status

| Area | State |
|---|---|
| Auth: register, login, logout, forgot and reset password | ✅ Done |
| Profile: update, change password, delete account | ✅ Done |
| Addresses | ✅ Done |
| Catalogue: products contract, product detail, reviews, related, categories, collections, featured reviews | ✅ Done |
| Promo code preview, newsletter, support messages | ✅ Done |
| Orders: `GET /me/orders`, `GET /orders/:id` | ✅ Done (reading only) |
| Checkout: `POST /checkout/quote`, `POST /orders`, payment webhook, cancel | ⏳ Next phase. Needs the payment provider and currency decisions. `POST /orders` and cancel answer `501 not_implemented` until then. |
| Admin endpoints | ⏳ After checkout |
| Real email sending | ⏳ Emails are printed to the console. Connect a provider in `src/lib/email.ts`. |

## Running it

```bash
cd server
npm install
npm run dev          # http://localhost:4000/api, restarts when files change
```

Nothing else needs installing. Without `DATABASE_URL`, the API uses an embedded PostgreSQL (PGlite) in `server/.data/dev`. On first start, it applies the migrations and loads the storefront's sample catalogue and the demo account (`demo@example.com` / `Nova2026!`).

To run the storefront against it, use a second terminal at the repo root:

```bash
VITE_USE_MOCK_DATA=false npm run dev    # Vite forwards /api to localhost:4000
```

Emails, such as the password reset link, are printed in the API's terminal.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API and restarts it on changes |
| `npm start` | Starts the API |
| `npm test` | Runs every test, each file on its own in-memory database |
| `npm run typecheck` | Type-checks with `tsc` (Node runs the code without it) |
| `npm run db:generate` | Writes a migration to `drizzle/` after you change `src/db/schema.ts` |
| `npm run db:migrate` | Applies pending migrations. Run this before starting in production. |
| `npm run db:seed` | Loads the sample catalogue, shipping methods and promotions. Add `-- --demo` for the demo account (never in production). |
| `npm run db:reset` | Deletes the embedded development database. The next `npm run dev` recreates it. |
| `npm run db:backup` | Backs up the database in `DATABASE_URL` to `backups/` (see [docs/BACKUPS.md](../docs/BACKUPS.md)) |
| `npm run db:restore-test -- <file>` | Restores a backup into a throwaway PostgreSQL in Docker and checks it matches: PASS or FAIL |

## Layout

```
server/
├── drizzle/                  Generated SQL migrations (commit these)
├── src/
│   ├── index.ts              Starts the server
│   ├── app.ts                Builds the API from the route modules
│   ├── env.ts                Configuration (see .env.example)
│   ├── shared.ts             The storefront's validation rules and sample data, imported directly
│   ├── db/                   schema.ts, client.ts, migrate.ts, seed.ts, reset.ts
│   ├── lib/                  errors, validation, crypto (IDs, tokens, passwords), money, rate limits, email
│   └── modules/
│       ├── accounts/         auth.ts, profile.ts, addresses.ts, sessions.ts (auth middleware)
│       ├── catalog/          products.ts (the GET /products contract), routes.ts
│       ├── engagement/       promo codes, newsletter, support
│       └── orders/           reading orders; checkout comes next
└── test/                     One file per area, plus helpers.ts
```

## Conventions

- **Errors** are thrown as `ApiError(status, code, message)` and returned as `{ message, code }`. `message` is shown to shoppers, so write it for them. Return 401 only for a missing or invalid session, because the storefront signs the user out on it.
- **Money** is integer cents in the database, and dollars in the API. Convert with `toCents` and `toDollars` in `lib/money.ts`, and only at the edges.
- **Validation** uses zod schemas through `readBody` and `readQuery`. Address, phone and email rules come from the storefront's own code through `shared.ts`, so both sides always agree.
- **Secrets:** sessions, password resets and guest order tokens are stored only as SHA-256 hashes. Passwords use scrypt from Node's standard library (N=2^15, r=8, p=3; older hashes upgrade at sign-in). Sessions end after 30 days unused or 90 days after sign-in; `src/db/purge.ts` deletes ended sessions and spent links every 6 hours.
- **Tests** call the API in-process with `app.request()`, so there's no network. Rate limits are off in tests except the one test that checks them.

## Before production

1. Never run `db:seed -- --demo` against production: the demo password is public. It refuses on production and on any database not on this machine (set `ALLOW_DEMO_ACCOUNT=true` only for a test database).
2. Use a managed PostgreSQL 17 with automatic backups and point-in-time recovery turned on (checklist in [docs/BACKUPS.md](../docs/BACKUPS.md)). Set `DATABASE_URL` and `NODE_ENV=production`. Run `npm run db:migrate`, then `npm run db:seed` (without `--demo`). Then take a backup and run the restore test once before launch.
3. Connect a transactional email provider in `createProductionMailer` (`src/lib/email.ts`). Until you do, the API **refuses to start** with `NODE_ENV=production`: the development mailer prints emails, and with them working reset and confirmation links, to the logs.
4. Serve the API at `/api` on the storefront's domain, for example with a Vercel rewrite to the API's host. The storefront calls `/api` by default, so no CORS setup is needed.
5. If the API runs behind a proxy (a Vercel rewrite, a load balancer), set `TRUST_PROXY_HOPS` to the number of proxies, usually `1`. Otherwise every request looks like it comes from the proxy, and all shoppers share one rate limit. Never set it when clients reach the API directly: they could then fake their IP to dodge the limits.
6. **Host the API on a long-running server** (Render, Railway, Fly.io or similar), not serverless functions: it runs a cleanup job every 6 hours and keeps a connection pool. You can run several instances: rate limits are kept in PostgreSQL, so they hold across all of them. Keep `instances × DB_POOL_MAX` below your database plan's connection limit; past that, add a pooler such as PgBouncer. The database needs the `pg_trgm` extension (migration 0004 creates it); every major managed PostgreSQL offers it.
7. Set `APP_URL` (the storefront's public URL, used in email links) and `SUPPORT_EMAIL` (an address on your own domain). The API refuses to start in production without them.
8. Set a budget with alerts on the API host and the database as you sign up, and cap autoscaling: see [docs/COSTS.md](../docs/COSTS.md).
9. Make each migration safe to roll back from, and take a backup before releasing one: see [docs/ROLLBACK.md](../docs/ROLLBACK.md).
10. Product images are seeded as Unsplash photo IDs, which the storefront expands. Real products should store full CDN URLs; the storefront accepts those too.

## Logs, errors and health

- **Logs** go through `src/lib/logger.ts`: one JSON line per event in production (for your log service), readable lines in development. `LOG_LEVEL` sets the minimum: `debug`, `info` (production default), `warn`, `error` or `silent`. Fields named like passwords, tokens or authorization headers are written as `[redacted]`, and query strings are never logged.
- **Every request** gets an id (`X-Request-Id` header; a valid id from a proxy is kept) and one summary line: method, path, status, duration, user and error code. Requests over 1 second are logged as warnings.
- **Unexpected errors** are logged with the request id, route, user, the database rule that failed (PostgreSQL `code`, `constraint`, `detail`), the stack and its causes. The shopper sees a plain message quoting the request id as a reference. To trace a report, search the logs for that id.
- **Storefront crashes** are sent to `POST /api/client-errors` and logged as `Storefront error`, with the reference the shopper saw (`ui_…`), the component stack and the request id of any API call that failed just before.
- **Startup failures** log one line naming the step (connecting to the database, applying migrations) and the database's reason. Errors outside any request (unhandled rejections, uncaught exceptions) are logged too; an uncaught exception exits so the host restarts the process.
- **Health:** point an uptime monitor at `/api/health` and your load balancer or host's health check at `/api/health/ready`, which answers 503 when the database is unreachable or migrations are missing.
