# NOVA Storefront

NOVA is an online storefront for electronics, fashion, accessories and home goods. It's a single-page React app with a full shopping flow: browsing and filtering, product pages, a cart, checkout, order history, accounts and a wishlist.

By default the app runs in **sample-data mode**: it serves products from local files and keeps accounts, orders and addresses in the browser's `localStorage`, so you can try every flow without a server. The backend API in [server/](server/README.md) covers everything except checkout so far; see [Running against the real API](#running-against-the-real-api).

**Stack:** React 19 · React Router 7 · Vite 8 · Tailwind CSS 4 · Axios · Lucide icons

## Getting started

You need **Node.js 20.19+ or 22.12+**.

```bash
npm ci                 # install the exact versions in package-lock.json
cp .env.example .env   # optional: the defaults already use sample data
npm run dev            # start the dev server at http://localhost:5173
```

### Running against the real API

The backend lives in [server/](server/README.md) and needs **Node.js 22.18+**, because it runs TypeScript directly. It needs no database install for development: it runs an embedded PostgreSQL and fills it with the same sample data.

```bash
cd server && npm install && npm run dev          # terminal 1: API at http://localhost:4000/api
VITE_USE_MOCK_DATA=false npm run dev             # terminal 2 (repo root): Vite forwards /api to it
```

After the first `npm install` in `server/`, one command at the repo root starts both, and Ctrl+C stops both:

```bash
npm run dev:all
```

Checkout isn't connected yet. In this mode, placing an order shows "Checkout isn't available yet" and the order isn't created.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server with hot reload |
| `npm run dev:all` | Starts the API and the storefront together, the storefront on the real API. Ctrl+C stops both. macOS and Linux only. |
| `npm run build` | Builds the production site into `dist/` |
| `npm run preview` | Serves the `dist/` build locally so you can check it before deploying |

## Configuration

Settings come from environment variables in `.env`. Vite only exposes variables whose names start with `VITE_` to the app.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_USE_MOCK_DATA` | `true` | Set it to `false` to send every request to the real API instead of using sample data. |
| `VITE_API_URL` | `/api` | The backend's base URL, for example `http://localhost:4000/api`. |
| `VITE_SITE_DOMAIN` | `example.com` | The domain the shop's email addresses use (`support@…`, `privacy@…`, `legal@…`, `careers@…`). `example.com` is a placeholder that reaches no one. Required for a production launch. |
| `VITE_DEMO_SITE` | unset (`true` in [.env.production](.env.production)) | Shows a "Demo store" banner on every page. On while the live site runs on sample data. |

## Trying it out in sample-data mode

| What | How |
|---|---|
| Sign in | `demo@example.com` / `Nova2026!`, or register a new account |
| Promo codes | `NOVA10` (10% off), `WELCOME15` (15% off orders over $150), `FREESHIP` |
| Successful payment | Any valid card number |
| Declined payment | A card number ending in `0002` |
| Password reset | Request a reset on `/forgot-password`. No email is sent, so the page shows the reset link instead. |

Sample data lives only in your browser. To reset it, clear the site's storage in your browser's dev tools. All the keys start with `nova:`.

## Project layout

```
server/              The backend API (see server/README.md)
src/
├── main.jsx         Entry point: mounts <App />
├── App.jsx          All routes and lazy-loaded pages
├── layouts/         Page shells: Main, Auth, Checkout, Account
├── pages/           One file per route
├── components/      Grouped by feature (cart, checkout, pdp, shop…) plus ui/ primitives
├── context/         App-wide state: auth, cart, wishlist, UI overlays, toasts
├── services/        API layer, with a sample-data fallback in each call
├── hooks/           Reusable hooks (forms, async loading, shop filters…)
├── data/            Sample catalogue and site content
├── utils/           Pure helpers: pricing, validation, formatting
└── index.css        Tailwind import and NOVA design tokens
```

[ARCHITECTURE.md](ARCHITECTURE.md) explains how these pieces fit together and how to connect the real backend. For the backend itself, [docs/API.md](docs/API.md) is the API specification and [docs/DATA_MODEL.md](docs/DATA_MODEL.md) is the database design.

## Deployment

The site is deployed on Vercel. Every push to `main` goes live, and each pull request gets a preview deployment. GitHub Actions ([ci.yml](.github/workflows/ci.yml)) builds the storefront and runs the API's type check and tests on every pull request; merge only when both are green.

**Something broke after a deploy?** Roll back first, investigate second: [docs/ROLLBACK.md](docs/ROLLBACK.md) has the one-click and one-command steps.

**Costs.** Before taking real orders, move Vercel to a plan that allows commercial use and turn on its spending alerts. Set a budget on every service as you sign up for it: [docs/COSTS.md](docs/COSTS.md) has the steps and a monthly check.

`npm run build` produces a static site in `dist/` that any static host can serve. Routing happens in the browser, so the host must answer every path that isn't a real file with `index.html`. Otherwise, refreshing a page like `/shop` gives a 404.

- **Vercel:** [vercel.json](vercel.json) already does this with a rewrite.
- **Other hosts:** add the equivalent "SPA fallback" rule. On Netlify, for example, that's a `_redirects` file containing `/* /index.html 200`.

**Production is a labelled demo until the API is hosted.** [.env.production](.env.production) sets `VITE_DEMO_SITE=true`, so every build shows a "Demo store: orders, payments and accounts aren't real" banner, and the site runs on sample data. A production build on sample data *without* that banner is refused on purpose: accounts and orders would live only in each shopper's browser, with nothing telling them.

**At launch**, once the API is hosted:
1. In Vercel → Settings → Environment Variables (Production), set `VITE_USE_MOCK_DATA=false`, `VITE_SITE_DOMAIN` (see "Custom domain" below), and `VITE_API_URL` if the API isn't served at `/api`.
2. Delete `VITE_DEMO_SITE` from `.env.production`. The build refuses a demo banner on a site that takes real orders.

**Custom domain.** The site has none yet; it runs at the `vercel.app` address. Don't use `nova.store`: it belongs to someone else. Once you've bought a domain:
1. In Vercel → Settings → Domains, add both `yourdomain.com` and `www.yourdomain.com`, and set one to redirect to the other. Redirect one way only, so there's no loop.
2. At your registrar, add the records Vercel lists. Usually that's an `A` record for `@` pointing to Vercel's IP, and a `CNAME` for `www` pointing to Vercel's DNS target. Vercel issues the HTTPS certificate once DNS resolves, usually within minutes.
3. Set `VITE_SITE_DOMAIN=yourdomain.com` (Vercel, Production) and, for the API, `APP_URL=https://yourdomain.com` and `SUPPORT_EMAIL=support@yourdomain.com`. The API won't start in production without the last two.
4. Set up the mailboxes (`support@`, `privacy@`, `legal@`, `careers@`) and SPF and DKIM for the address emails are sent from.

**Security headers.** [vercel.json](vercel.json) also sends a Content-Security-Policy and the usual protective headers. The policy allows scripts and API calls only from the site itself, styles and fonts only from the site itself (the fonts are self-hosted in `src/assets/fonts`), and images from Unsplash. If you add a script, font, image host or API on another domain (a payment provider's checkout, a CDN for product photos, a `VITE_API_URL` on another origin), add it to the policy, or the browser will block it.

**Trusted Types.** The policy also turns on Trusted Types (`require-trusted-types-for 'script'`), so the browser refuses to turn text into HTML or script: `innerHTML`, `insertAdjacentHTML`, `dangerouslySetInnerHTML`, setting a script's `src` from code, and so on. That's how injected scripts usually get in, and the session token is in browser storage, so this matters. React renders without any of these, and every page was checked in Chrome under the policy. If you add a library that writes HTML (a rich-text renderer, a widget that injects a script tag), it will break in production but not in `npm run dev`, which sends no policy. Check it with `npm run build && npm run preview` plus the headers, or on a Vercel preview.

**Violation reports.** Browsers report anything the policy blocks to `POST /api/csp-reports` (`report-uri`), and the API logs each one as a `CSP violation` warning, with tokens in URLs redacted. A burst of them, especially with `blocked: "trusted-types-sink"` or an outside script address, can mean someone is trying to inject a script: look at which page and what was blocked. Normal browsing produces none.
