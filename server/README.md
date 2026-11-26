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

Nothing else needs installing. Without `DATABASE_URL`, the API uses an embedded PostgreSQL (PGlite) in `server/.data/dev`. On first start, it applies the migrations and loads the storefront's sample catalogue and the demo account (`demo@nova.store` / `Nova2026!`).

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
- **Secrets:** sessions, password resets and guest order tokens are stored only as SHA-256 hashes. Passwords use scrypt from Node's standard library.
- **Tests** call the API in-process with `app.request()`, so there's no network. Rate limits are off in tests except the one test that checks them.

## Before production

1. Set `DATABASE_URL` and `NODE_ENV=production`. Run `npm run db:migrate`, then `npm run db:seed` (without `--demo`).
2. Connect a transactional email provider in `src/lib/email.ts`.
3. Serve the API at `/api` on the storefront's domain, for example with a Vercel rewrite to the API's host. The storefront calls `/api` by default, so no CORS setup is needed.
4. If the API runs behind a proxy (a Vercel rewrite, a load balancer), set `TRUST_PROXY_HOPS` to the number of proxies, usually `1`. Otherwise every request looks like it comes from the proxy, and all shoppers share one rate limit. Never set it when clients reach the API directly: they could then fake their IP to dodge the limits.
5. The rate limiter keeps its counters in memory. That's fine for one instance; with several, move the counters to the database or Redis.
6. Product images are seeded as Unsplash photo IDs, which the storefront expands. Real products should store full CDN URLs; the storefront accepts those too.
