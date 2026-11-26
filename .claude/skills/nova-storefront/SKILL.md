---
name: nova-storefront
description: How to work on the NOVA storefront (React 19, Vite 8, Tailwind 4, React Router 7, axios services with a sample-data mode) end to end, as a senior engineer would. Covers fixing errors and bugs with the simplest fix that solves the real cause, adding pages, components, services and state, styling with the NOVA tokens, connecting the backend, verifying changes and shipping them. Use this skill for any task in this repo, even small ones, and especially when something is broken, throws an error, fails to install or build, looks wrong, or behaves unexpectedly, even if the user only pastes an error message or says "it doesn't work".
---

# Working on the NOVA storefront

NOVA is a React single-page app with a Node API in `server/` (see `server/README.md` for its conventions and tests). Every page reads data through service modules in `src/services/`. In sample-data mode (the default), those services return sample data from `src/data/` and store accounts, orders and addresses in `localStorage`. With `VITE_USE_MOCK_DATA=false` they call the API, which covers everything except placing and cancelling orders so far. `ARCHITECTURE.md` at the repo root has the full design. Read it when a task touches more than one layer.

Work the way a careful senior engineer would. Understand the problem before changing anything. Prefer the smallest change that fixes the real cause. Reuse what the codebase already has. Prove the change works before calling it done. People of very different experience levels use this repo, so explain what you found and what you changed in plain words.

## 1. Fixing errors and bugs: find the simplest fix that is also correct

This matters most. The goal is the *simplest best* fix: the smallest change that removes the **cause** of the problem, not just the symptom. A fix that hides an error (an extra `try/catch`, a `?.` to dodge an `undefined`, a timeout, a disabled check) usually just moves the bug somewhere harder to find. A rewrite usually brings new bugs. The right fix is almost always somewhere in between, and smaller than you'd expect.

### The process

1. **Reproduce it first.** Get the exact error text, the route, and the steps. Note whether the user is signed in, what's in the cart, and whether sample-data mode is on. If you can't make it happen, you can't know you fixed it. When the user only describes it, run the app (`npm run dev`, or the smoke script in section 6) and look.
2. **Read the whole error message.** The first line says what failed. The stack trace and file path say where. Messages in this codebase are written to be specific, for example `useCart must be used inside <CartProvider>`.
3. **Find the layer.** Decide whether the problem is in install/tooling, config/env, routing, state, a service, data, or styling. The table below maps common symptoms to their usual cause in this repo. Check the cheap explanations first.
4. **Find the root cause, then pick the smallest change that fixes it.** Climb this ladder and stop at the first rung that fixes the *cause*:
   1. No code change needed: reinstall, restart the dev server, clear stale `nova:*` storage, fix `.env`.
   2. Fix data or config: a sample-data entry, a route, a Tailwind token.
   3. A one-line or few-line fix in the file that is actually wrong.
   4. A change inside one layer, reusing an existing helper (`computeTotals`, `useAsync`, `useForm`, `formatPrice`, `imageUrl`, `cn`, the `ui/` components).
   5. Only when the design itself is wrong: a change across layers. Explain why before doing it, and get the user's agreement if it's large.
5. **Check that the fix doesn't break other code.** Search for other callers of whatever you changed (`grep -rn "functionName" src`). Shared helpers like `computeTotals`, `productService.findById` and the contexts are used in many places.
6. **Verify.** Repeat the original reproduction, then run `npm run build` and the smoke script. Tell the user what you checked and what you didn't.
7. **Explain it simply.** Say what was wrong, why, what you changed, and how you confirmed it. One short paragraph is usually enough.

### Rules of thumb

- Fix the bug where it starts, not where it shows up. If a page shows `$NaN`, the bug is in whatever produced the number.
- Don't add a dependency to fix a bug unless the platform really can't do the job. The codebase avoids libraries on purpose: no state library, no form library, no test library yet.
- Don't change unrelated code in the same fix. Mention other problems you notice instead of fixing them silently.
- If two fixes are equally small, pick the one that fits the existing patterns, so the next person recognises it.
- When you're not sure of the cause, say so and test your guess with a quick experiment (a `console.log`, a temporary storage reset) before writing the fix. Remove the experiment afterwards.
- If the "bug" is actually intended behaviour (see "Intended behaviour" below), say so instead of changing it.

### Common symptoms and their usual causes in this repo

| Symptom | Usual cause | Simplest fix |
|---|---|---|
| `npm ci` fails: `Missing: <pkg> from lock file` | `package-lock.json` is out of sync with `package.json`, often missing optional platform packages | Run `npm install`, commit the updated lockfile |
| `vite: command not found` | `node_modules` isn't installed | `npm ci` |
| Install or start fails with an engine or syntax error | Node is older than `^20.19.0 \|\| >=22.12.0` | Upgrade Node. Don't downgrade Vite. |
| `useX must be used inside <XProvider>` | A component renders outside `AppProviders`, or a provider uses a context that's declared *below* it in `AppProviders.jsx` | Move the component inside the provider, or reorder the providers. The order is `Toast → Auth → UI → Wishlist → Cart`. |
| Strange cart, wishlist or session state after changing a data shape | An old value under a `nova:*` key in `localStorage` no longer matches the new code | Locally: clear site storage. In code: make the reader tolerate the old shape, or rename the key. |
| `import.meta.env.VITE_…` is `undefined` | The variable name doesn't start with `VITE_`, or the dev server wasn't restarted after editing `.env` | Rename it, then restart `npm run dev` |
| Every request fails once `VITE_USE_MOCK_DATA=false` | `VITE_API_URL` is wrong, the backend isn't running, or CORS | Check the Network tab. `error.userMessage` shows the server's `message`. |
| A Tailwind class has no effect | The class name is built at runtime (`` `bg-${color}` ``), so Tailwind never sees it, or the token isn't in `@theme` in `src/index.css` | Write full class names (use a lookup object like `variants` in `Button.jsx`), or add the token to `@theme` |
| Hover style sticks on phones | `hover:` was used instead of the custom `can-hover:` variant | Use `can-hover:` |
| Image is broken or blank | `imageUrl` expects an Unsplash photo id or a full `http`/`/` URL | Pass the right kind of value, and check `src/data/*` |
| Page is blank or flashes, no error shown | A lazy page threw while loading, or `useAsync` data is `null` and the component reads into it | Check the browser console. Handle the `loading` / `error` / empty states as `CollectionPage.jsx` does. |
| Component re-renders forever, or requests repeat | A `useAsync` / `useEffect` dependency is a new object or function on every render | Depend on primitive values (a `slug`, `sort`), or memoise the value |
| "Undo" restores the wrong item | A callback read state that was captured earlier | Read from a ref, as `WishlistContext` does with `idsRef` |
| Totals differ between the drawer, cart and checkout | Someone calculated totals outside `computeTotals` | Use `computeTotals` from `src/utils/pricing.js` everywhere |
| Sign-in keeps redirecting, or sign-out lands on `/login` | `RequireAuth` / `exitTo` logic, or a `redirect` param that isn't a same-origin path | See `RequireAuth.jsx` and `useRedirectTarget` in `AuthLayout.jsx` |
| Refreshing a deep link like `/shop` gives 404 in production | The host isn't sending unknown paths back to `index.html` | On Vercel, check `vercel.json` (its rewrite to `/index.html`) is still there and deployed. On other hosts, add an SPA fallback rule. |
| In API mode, a cart or wishlist item is missing, or the cart shows a blank placeholder | The product cache couldn't load it: `GET /products?ids=…` failed, or didn't return that id | Check that request in the Network tab. Missing ids are dropped on purpose (deleted products). See "The product cache" in `ARCHITECTURE.md`. |
| The backend rejects or ignores a product filter | It doesn't follow the `GET /products` contract | Send parameters only through `fetchProducts` in `productService.js`, and match the contract table in `ARCHITECTURE.md` |
| `err.code` is missing or an axios code like `ERR_BAD_REQUEST` | The API's error body isn't `{ message, code }` | Fix the backend response. The interceptor in `api.js` already copies `code`. |
| The user is signed out with "Your session has ended" | The API returned 401 to a request that carried a token | Intended. If it happens too often, the backend is returning 401 for something that isn't an expired session. |
| Form errors appear too early, or never appear | `useForm` shows an error only after the user leaves a field, or after the first submit | Spread `field(name)` onto the input so it gets `onBlur`. Call `submit()` before checking errors. |

### Intended behaviour (not bugs)

These look like bugs in sample-data mode but are deliberate:

- Pages take 300–1600 ms to load. `mockDelay` adds this on purpose so loading states actually appear.
- A card number ending in `0002` is always declined, so the payment error state can be tested.
- Promo `WELCOME15` is kept in the cart but marked inactive under $150 (`promoShortfall`).
- In sample-data mode, the forgot-password page shows the reset link, because no email is sent.
- Free shipping is decided by the subtotal *before* discounts.
- Only three toasts show at once.

## 2. Project map

```
src/
├── main.jsx, App.jsx  Entry point and every route (pages lazy-loaded except HomePage)
├── layouts/           MainLayout, AuthLayout, CheckoutLayout, AccountLayout
├── pages/             One file per route (default export)
├── components/        Folders by feature (cart, checkout, pdp, shop, product, home, layout, account, auth, wishlist)
│   └── ui/            Shared building blocks: Button, IconButton, Field, Sheet, Accordion, ConfirmDialog,
│                      EmptyState, ErrorState, Skeleton, SmartImage, Price, Rating, Badge, Container…
├── context/           Auth, Cart, Wishlist, UI (overlays), Toast, all combined in AppProviders.jsx
├── services/          api.js (axios, USE_MOCK_DATA, mockDelay) plus one module per area
├── hooks/             useAsync, useForm, useLocalStorage, useProducts, useShopFilters, useDocumentTitle, useEscapeKey, useLockBodyScroll
├── data/              Sample catalogue and site content (same shape the API will return)
├── utils/             Pure helpers: pricing, validation, format, image, cn
└── index.css          Tailwind import, @theme tokens, the can-hover variant
```

Each layer only depends on the layers below it: pages → components → context → services → data/utils. **Components never call axios.** Every network call goes through a service.

## 3. Building features: follow the existing patterns

Before writing something new, look for an existing piece that already does it. `src/components/ui/`, `src/hooks/` and `src/utils/` cover most needs. Copy the shape of a similar file nearby. Matching the codebase is better than being clever.

**A new page**
1. Create `src/pages/XPage.jsx` with a default export. Call `useDocumentTitle('X')`.
2. Add it to `App.jsx` with `lazy(() => import(...))` under the right layout. Wrap it in `RequireAuth` if it's private (put it under `/account`).
3. Load data with `useAsync(() => service.call(arg), [arg])`. Render all four states: loading (a `Skeleton` or `aria-busy` placeholder), error (`<ErrorState onRetry={retry} />`), empty (`<EmptyState …/>`) and data. `CollectionPage.jsx` is the reference example.
4. Wrap the content in `<Container>`. If it's a main section, add it to `mainNav` / `footerLinks` in `src/data/site.js`.

**A new backend call**
Add a method to the right service, following the same two-branch pattern:
```js
async getThing(id) {
  if (!USE_MOCK_DATA) {
    const { data } = await api.get(`/things/${id}`);
    return data;
  }
  return mockDelay(sampleThing(id));
}
```
Reject with an `Error` that has a `userMessage` (and a `code` if callers need to tell errors apart). UI code shows `error.userMessage`. Add the endpoint to the "Connecting the real backend" table in `ARCHITECTURE.md`.

**Products are special.** Every product list goes through `fetchProducts` in `productService.js`, which is the single `GET /products` contract. Add new filters there and to the contract table in `ARCHITECTURE.md`; don't call `api.get('/products')` directly. Screens that hold product ids (cart, wishlist, "Buy again") get products through `useProducts(ids)` or `productService.loadByIds`, and must handle its `loading` state. `findById` alone returns `null` in API mode until the product is loaded.

**App-wide state**
First ask whether it really needs to be global. Most state belongs in the page (`useState`) or the URL (`useSearchParams`, as `useShopFilters` does for filters). If it really is global, add it to the closest existing context. Create a new context only for a genuinely new area, and add it to `AppProviders.jsx` *below* any providers it uses. Expose a `useX()` hook that throws outside the provider. Save it with `useLocalStorage('nova:<name>', …)` if it should survive a page reload. Store IDs, not whole objects, as the cart does, so prices and details stay current.

**Forms**
Use `useForm(initialValues, validate)`. `validate` returns `{ field: message }`. Spread `field('name')` onto `Field` inputs. Reuse validators from `src/utils/validation.js` (email, phone, postcode by country, card number with Luhn check, expiry, CVC). On submit, `const errors = submit(); if (Object.keys(errors).length) return;`, and show service errors with an `Alert` or a toast.

**Feedback to the user**
Use `useToast().toast({ title, description, variant, action })` for short confirmations, with `action: { label: 'Undo', onClick }` for actions that can be undone. Use `ConfirmDialog` for destructive actions.

**Sample data**
Components never import `src/data/products.js` directly; they go through `productService`, which loads the sample catalogue from `src/services/mock/catalog.js` only in sample-data mode. Add products through the `p({...})` helper in `src/data/products.js`. It fills in defaults. The `id` and `slug` must be unique. `image` is an Unsplash photo id. Keep the shape matching what the API will return.

## 4. Styling

- Use Tailwind 4 utility classes with the NOVA design tokens from the `@theme` block in `src/index.css`: `ink`, `ink-soft`, `muted`, `subtle`, `line`, `line-strong`, `surface`, `accent`, `danger`, and `font-display` / `font-sans`. Don't hard-code hex colours in components. Add a token instead.
- Use the type scale, not `text-[Npx]`: Tailwind's sizes plus `text-2xs` (11px), `text-caption` (13px), `text-body` (15px), `text-heading` (28px) and `text-title` (32px). Use the `eyebrow` utility for the small uppercase label above a heading.
- Check contrast when you add or change a colour: 4.5:1 for normal text on every background it appears on, including tinted badges (`bg-success/10`) and grey cards (`bg-surface`).
- There's no `tailwind.config.js`. Tailwind 4 is set up in CSS.
- Combine conditional classes with `cn()`. Write class names out in full, never build them from strings at runtime.
- Use `can-hover:` for hover effects, so they don't stick on touch screens.
- Use the `ui/` components (`Button` variants and sizes, `Field`, `Sheet`) instead of restyling raw elements.
- Show prices with `formatPrice` / `<Price>`, never `toFixed`. Build image URLs with `imageUrl` / `SmartImage`.

## 5. Accessibility, security and data handling

- Keep the "Skip to content" link and `id="main"`. Give every input a label (`Field` does this). Hide decorative icons with `aria-hidden="true"`, and give `IconButton` an accessible label. Overlays use `useEscapeKey` and `useLockBodyScroll`. New colours must meet WCAG AA contrast.
- Never send or store a full card number. The checkout sends only `{ method, brand, last4 }`. Post-login redirects must stay same-origin (`useRedirectTarget`).
- Sample-data authentication (SHA-256 hashes in `localStorage`) is for development only. Don't build on it as if it were real security, and point that out if a task depends on it.
- Never commit `.env`. Put new variables in `.env.example`, documented, with names starting with `VITE_`. Anything named `VITE_` ends up in the public bundle, so never put secrets there.

## 6. Verifying a change

Run these from the repo root, roughly from cheapest to most thorough:

```bash
npm run build                                         # compiles every page, including lazy ones
bash .claude/skills/nova-storefront/scripts/smoke.sh  # loads every route in headless Chrome
bash .claude/skills/nova-storefront/scripts/smoke.sh "/shop?sale=1"   # plus extra paths
```

The smoke script starts the dev server, visits every route twice (signed out, then signed in with items in the cart) and lists console errors, page errors and failed requests for each page. It exits with a non-zero status if any page failed. It needs Google Chrome; set `CHROME_PATH` if Chrome isn't in the default macOS location. It installs `puppeteer-core` in a temporary folder, never into the project. When you add a route, add it to the lists in `scripts/smoke.mjs`.

The smoke script checks that pages *load*. It doesn't click through flows. For changes to the cart, checkout, auth or forms, also try the flow by hand in `npm run dev`, or write a short puppeteer check modelled on `smoke.mjs`. The demo account is `demo@nova.store` / `Nova2026!`, and the promo codes are `NOVA10`, `WELCOME15` and `FREESHIP`.

The project has no unit tests or linter yet. If a change touches pure logic (`utils/pricing.js`, `utils/validation.js`, `checkoutSchema.js`), check it with a quick `node -e` script, and suggest adding Vitest.

Tell the user honestly what you verified and what you didn't.

## 7. Shipping

- Branch from an up-to-date `main` (`git fetch origin main:main`, then branch from it) with a clear name: `fix/…`, `feat/…`, `docs/…`. Keep each branch to one concern.
- Commit `package-lock.json` whenever dependencies change. Check with `npm ci` that it installs cleanly.
- Every pull request gets a Vercel preview. Open it and check the changed pages there too.
- After a merge, update the local `main` before starting the next branch, so you don't work on a stale lockfile or stale code.
- Update `README.md` / `ARCHITECTURE.md` when a change affects setup, env vars, routes, endpoints or storage keys.
