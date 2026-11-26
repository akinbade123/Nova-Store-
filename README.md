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

Checkout isn't connected yet. In this mode, placing an order shows "Checkout isn't available yet" and the order isn't created.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server with hot reload |
| `npm run build` | Builds the production site into `dist/` |
| `npm run preview` | Serves the `dist/` build locally so you can check it before deploying |

## Configuration

Settings come from environment variables in `.env`. Vite only exposes variables whose names start with `VITE_` to the app.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_USE_MOCK_DATA` | `true` | Set it to `false` to send every request to the real API instead of using sample data. |
| `VITE_API_URL` | `/api` | The backend's base URL, for example `http://localhost:4000/api`. |

## Trying it out in sample-data mode

| What | How |
|---|---|
| Sign in | `demo@nova.store` / `Nova2026!`, or register a new account |
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

The site is deployed on Vercel. Each pull request gets a preview deployment.

`npm run build` produces a static site in `dist/` that any static host can serve. Routing happens in the browser, so the host must answer every path that isn't a real file with `index.html`. Otherwise, refreshing a page like `/shop` gives a 404.

- **Vercel:** [vercel.json](vercel.json) already does this with a rewrite.
- **Other hosts:** add the equivalent "SPA fallback" rule. On Netlify, for example, that's a `_redirects` file containing `/* /index.html 200`.
