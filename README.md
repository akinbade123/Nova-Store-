# NOVA Storefront

NOVA is an online storefront for electronics, fashion, accessories and home goods. It's a single-page React app with a full shopping flow: browsing and filtering, product pages, a cart, checkout, order history, accounts and a wishlist.

The backend API hasn't been built yet. Until it is, the app runs in **sample-data mode**: it serves products from local files and keeps accounts, orders and addresses in the browser's `localStorage`. You can try every flow without a server.

**Stack:** React 19 · React Router 7 · Vite 8 · Tailwind CSS 4 · Axios · Lucide icons

## Getting started

You need **Node.js 20.19+ or 22.12+**.

```bash
npm ci                 # install the exact versions in package-lock.json
cp .env.example .env   # optional: the defaults already use sample data
npm run dev            # start the dev server at http://localhost:5173
```

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

Sample data lives only in your browser. To reset it, clear the site's storage in your browser's dev tools. All the keys start with `nova:`.

## Project layout

```
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

[ARCHITECTURE.md](ARCHITECTURE.md) explains how these pieces fit together and how to connect the real backend.

## Deployment

The site is deployed on Vercel. Each pull request gets a preview deployment. `npm run build` produces a static site in `dist/` that any static host can serve. Because routing happens in the browser, the host must send every unknown path back to `index.html`.
