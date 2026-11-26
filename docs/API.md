# NOVA API specification

**Status:** v1. Sections 3–9 are **implemented** in [server/](../server/README.md), except placing and cancelling orders (`501 not_implemented` until section 10 is built). Every endpoint in sections 3–9 is already called by the storefront. Section 10 lists the endpoints the launch needs that the frontend doesn't call yet, and section 11 lists the frontend changes they require.

**Scope:** this spec assumes a custom backend. With a commerce engine (Medusa, Shopify), use it as the target that the frontend's service files in `src/services/` map onto.

The data model behind these endpoints is in [DATA_MODEL.md](DATA_MODEL.md). How the frontend uses the API is in [../ARCHITECTURE.md](../ARCHITECTURE.md).

**Contents**
1. [Conventions](#1-conventions)
2. [Errors](#2-errors)
3. [Shared objects](#3-shared-objects)
4. [Auth](#4-auth)
5. [Profile](#5-profile)
6. [Addresses](#6-addresses)
7. [Catalogue](#7-catalogue)
8. [Orders](#8-orders)
9. [Promotions, newsletter, support](#9-promotions-newsletter-support)
10. [New for launch: checkout, payments, admin](#10-new-for-launch-checkout-payments-admin)
11. [Frontend changes these require](#11-frontend-changes-these-require)

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base URL | `/api` on the same domain as the site (a Vercel rewrite to the API), so no CORS is needed. The frontend reads it from `VITE_API_URL`. |
| Format | JSON request and response bodies. `Content-Type: application/json`. |
| Auth | `Authorization: Bearer <token>`. The token is an opaque random string returned by login or register. The server stores only its hash, so sessions can be revoked (see `sessions` in the data model). |
| IDs | Strings. Products `p-…`, users `u-…`, addresses `addr-…`, orders `NV-` plus 10 random uppercase characters. Keep order IDs long so they can't be guessed. |
| Money | **Numbers in major units** (dollars), for example `249` or `4.95`. The frontend formats them. Store integer cents in the database and convert at the edge, never with floating-point maths. The currency is not decided yet; see "Open decisions" in DATA_MODEL.md. |
| Dates | ISO 8601 strings in UTC (`2026-11-12T14:22:00.000Z`). Review dates are `YYYY-MM-DD`. |
| Missing values | `null`, never an omitted key, for fields shown in this spec. |
| Lists | Plain arrays unless the endpoint says otherwise. `GET /products` is the only paginated list. |
| Rate limits | Return 429 with code `rate_limited`. Apply limits per client IP to login, register, forgot-password, reset-password, promo checks, newsletter and support. Login is also limited to 10 failed attempts per email per 15 minutes, from any IP. The client IP comes from the connection; `X-Forwarded-For` is used only when the server is told how many proxies are in front of it (`TRUST_PROXY_HOPS`), because clients can send any value in it. |

## 2. Errors

Every error response has this body:

```json
{ "message": "An account with this email already exists.", "code": "email_taken" }
```

- `message` is shown to the user as-is, so write it for shoppers: plain, specific, no stack traces.
- `code` is stable and lowercase. The UI branches on some codes, so don't rename them.
- **401 means only "no valid session".** When the frontend gets a 401 on a request that carried a token, it signs the user out. Use 403 for "signed in but not allowed", and 400/422 for bad input. A wrong password at login is 401 too; it's safe, because that request carries no token.

| Code | HTTP | When | UI relies on it |
|---|---|---|---|
| `validation_failed` | 422 | Body fails validation. Add `fields: { name: message }` so forms can show each error. | |
| `invalid_credentials` | 401 | Login email and password don't match | |
| `unauthorized` | 401 | Token missing, expired or revoked | **Yes**: signs the user out |
| `forbidden` | 403 | Signed in but not allowed, e.g. a non-admin calling `/admin/*` | |
| `email_taken` | 409 | Register, or a profile email change, uses an existing email | **Yes**: register page and settings page |
| `wrong_password` | 400 | Current password wrong: changing the password or email, deleting the account | |
| `invalid_token` | 400 | Reset token unknown, used or expired | **Yes**: reset-password page |
| `not_found` | 404 | Resource doesn't exist, or the caller can't see it | See [11](#11-frontend-changes-these-require), item 1 |
| `invalid_promo` | 404 | Promo code unknown, expired or used up | |
| `promo_min_subtotal` | 422 | Promo needs a higher subtotal. Include the minimum in `message`. | |
| `out_of_stock` | 409 | An item can't be fulfilled at checkout. Add `items: [productId]`. | |
| `price_changed` | 409 | The quote is stale; re-quote and show the new total | |
| `card_declined` | 402 | Payment declined | |
| `not_cancellable` | 409 | Order already shipped | |
| `rate_limited` | 429 | Too many requests | |

## 3. Shared objects

### User

The public user, returned by auth and profile endpoints. It never includes the password hash.

```json
{
  "id": "u-demo",
  "firstName": "Ada",
  "lastName": "Okafor",
  "email": "demo@nova.store",
  "marketing": true,
  "createdAt": "2025-03-14T10:00:00.000Z"
}
```

### Product

Returned by every product list.

```json
{
  "id": "p-001",
  "slug": "aura-wireless-headphones",
  "name": "Aura Wireless Headphones",
  "category": "electronics",
  "description": "Studio-grade sound with adaptive noise cancellation…",
  "price": 249,
  "compareAtPrice": 299,
  "badge": null,
  "rating": 4.8,
  "reviewCount": 1284,
  "images": [{ "src": "https://cdn.nova.store/p-001/1.jpg" }, { "src": "https://cdn.nova.store/p-001/1.jpg", "zoom": 1.6 }],
  "colors": [{ "name": "Midnight", "hex": "#1c1c1c" }, { "name": "Chalk", "hex": "#e9e6df" }],
  "sizes": [],
  "inStock": true,
  "stockCount": 24,
  "isFeatured": true,
  "isBestSeller": true,
  "createdAt": "2026-09-02"
}
```

| Field | Notes |
|---|---|
| `category` | The category **slug** |
| `compareAtPrice` | The original price when on sale, otherwise `null`. The sale filter and the discount sort use it. |
| `badge` | Short label such as `"New"`, or `null` |
| `images` | Ordered. `src` is a full URL. The optional `zoom`, `x` and `y` (0–1) crop a detail shot around a focal point. The sample data uses Unsplash IDs in `src`; the frontend accepts full URLs unchanged. |
| `sizes` | Strings such as `["S","M","L"]`, or `[]` |
| `stockCount` | The cart caps quantities at `min(stockCount, 10)`. `inStock` is `stockCount > 0`. |

### Product detail

The product page asks for `GET /products/:slug?include=details`. It gets a Product plus:

```json
{
  "gallery": [{ "src": "…" }, { "src": "…", "zoom": 1.6, "x": 0.5, "y": 0.5 }],
  "highlights": ["Adaptive noise cancellation", "40-hour battery with fast charge"],
  "specs": [["Battery", "40 hours"], ["Weight", "254 g"]],
  "care": "Wipe clean with a soft, dry cloth.",
  "sizeGuide": null
}
```

- `specs` is a list of `[label, value]` pairs.
- `sizeGuide` is `"apparel"`, `"shoes"` or `null`. The size-guide tables themselves are static in the frontend.

### Address

```json
{
  "id": "addr-home",
  "label": "Home",
  "firstName": "Ada",
  "lastName": "Okafor",
  "address1": "14 Admiralty Way",
  "address2": "Flat 3B",
  "city": "Lekki Phase 1",
  "region": "Lagos",
  "postalCode": "106104",
  "country": "NG",
  "phone": "+234 803 555 0142",
  "isDefault": true
}
```

- `country` is ISO 3166-1 alpha-2.
- Whether `region` and `postalCode` are required depends on the country (`src/utils/validation.js`). The server must apply the same rules.

### Order

```json
{
  "id": "NV-8K2Q4D7M1X",
  "userId": "u-demo",
  "createdAt": "2026-11-12T14:22:00.000Z",
  "status": "Shipped",
  "shippedAt": "2026-11-13T09:10:00.000Z",
  "deliveredAt": null,
  "cancelledAt": null,
  "tracking": { "carrier": "DHL Express", "number": "JD014600006281" },
  "contact": { "email": "demo@nova.store", "phone": "+234 803 555 0142", "marketing": true },
  "shippingAddress": { "firstName": "Ada", "lastName": "Okafor", "address1": "…", "address2": "…", "city": "…", "region": "…", "postalCode": "…", "country": "NG" },
  "billingAddress": { "…": "same shape as shippingAddress" },
  "shippingMethod": { "id": "express", "label": "Express", "eta": "1–2 business days" },
  "estimatedDelivery": "Fri 14 Nov – Mon 17 Nov",
  "payment": { "method": "card", "brand": "visa", "last4": "4242" },
  "items": [
    { "productId": "p-104", "slug": "moto-leather-jacket", "name": "Moto Leather Jacket", "image": "…", "price": 349, "quantity": 1, "color": null, "size": "M" }
  ],
  "totals": { "subtotal": 425, "discount": 0, "shipping": 0, "total": 425 },
  "promo": null
}
```

| Field | Notes |
|---|---|
| `status` | Exactly one of `Processing`, `Shipped`, `Delivered`, `Cancelled`. The UI uses these words as labels and filters. See the status mapping in DATA_MODEL.md. |
| `userId` | `null` for guest orders |
| `tracking` | `null` until shipped |
| `estimatedDelivery` | A display string in the `en-GB` short format the UI uses. The server works it out from the shipping method's `minDays` and `maxDays` in business days. |
| `items` | **Snapshots** taken at purchase: name, image and price don't change if the product does |
| `payment.method` | `card`, `paypal` or `applepay`. `brand` and `last4` are `null` unless it's a card. |
| `promo` | The Promotion applied, or `null` |

### Promotion

```json
{ "code": "WELCOME15", "type": "percent", "value": 15, "label": "15% off orders over $150", "minSubtotal": 150 }
```

`type` is `percent` (`value` is the percentage) or `shipping` (free shipping; `value` is `0`).

---

## 4. Auth

### `POST /auth/register`
```json
{ "firstName": "Ada", "lastName": "Okafor", "email": "ada@example.com", "password": "Password2026", "marketing": false }
```
- Returns **201** `{ "user": User, "token": "…" }`.
- Lowercase and trim the email.
- The password needs at least 8 characters, upper and lowercase letters, and a number. This matches `PASSWORD_RULES` in the frontend.
- Errors: `email_taken`, `validation_failed`.

### `POST /auth/login`
```json
{ "email": "ada@example.com", "password": "…" }
```
- Returns **200** `{ "user": User, "token": "…" }`.
- Errors: `invalid_credentials`. Use the same message whether the email or the password was wrong.
- "Remember me" is handled in the browser. A token should last 30 days, sliding: extend it each time it's used.

### `POST /auth/logout` (auth)
- Returns **204**. Revoke the session.
- The frontend ignores any error from this call.

### `POST /auth/forgot-password`
```json
{ "email": "ada@example.com" }
```
- Always returns **202** `{ "sent": true }`, **whether or not the account exists**, so the form can't be used to find out which emails have accounts.
- If the account exists, email a link to `https://<site>/reset-password?token=<token>`.
- The token is single-use, expires after 1 hour, and only its hash is stored.

### `POST /auth/reset-password`
```json
{ "token": "…", "password": "NewPassword2026" }
```
- Returns **200** `{ "reset": true }`.
- Mark the token used, and **revoke all of the user's sessions**.
- Errors: `invalid_token`, `validation_failed`.

## 5. Profile

All profile endpoints require auth.

### `PATCH /me`
- Takes any subset of `{ firstName, lastName, email, marketing }`. Returns **200** with the updated User.
- **Changing the email needs `currentPassword`** in the same body, because password resets go to that address: without it, a stolen session could redirect the email and take the account over. Sending your own unchanged email needs no password. The password is checked before whether the new email is taken, so a wrong password can't be used to discover accounts.
- Errors: `validation_failed` (no `currentPassword` when the email changes, in `fields.currentPassword`), `wrong_password` (400, never 401, so the storefront doesn't sign the user out), `email_taken`.
- Changing the email should require confirming the new address before it takes effect. That's v1.1; v1 may change it directly.

### `POST /me/password`
```json
{ "currentPassword": "…", "newPassword": "…" }
```
- Returns **200** `{ "changed": true }`, and revokes every session except the current one.
- Errors: `wrong_password`, `validation_failed`.

### `DELETE /me`
- Body: `{ "password" }`. Returns **200** `{ "deleted": true }`.
- Errors: `validation_failed` (missing, in `fields.password`), `wrong_password`.
- Revoke all sessions and delete addresses.
- **Don't delete orders**: they're needed for accounting. Anonymise the user instead (see "Account deletion" in DATA_MODEL.md).

## 6. Addresses

All address endpoints require auth.

**Every endpoint that changes an address returns the whole updated list**, because the page replaces its list with the response. There is always exactly one default address when the list isn't empty.

| Endpoint | Body | Returns |
|---|---|---|
| `GET /me/addresses` | | `Address[]` |
| `POST /me/addresses` | Address without `id` | `Address[]`. The first address becomes the default; `isDefault: true` makes this one the default. |
| `PUT /me/addresses/:id` | Address | `Address[]` |
| `DELETE /me/addresses/:id` | | `Address[]`. If the default was deleted, the first remaining address becomes the default. |
| `POST /me/addresses/:id/default` | | `Address[]` |

Errors: `not_found` (including another user's address), `validation_failed`.

## 7. Catalogue

All catalogue endpoints are public.

### `GET /products`

The single contract for every product list. All frontend calls go through `fetchProducts` in `src/services/productService.js`.

| Parameter | Type | Meaning |
|---|---|---|
| `q` | string | Search name, category and description, case-insensitive |
| `categories` | csv | Category slugs. A product matches if it's in any of them. |
| `ids` | csv | Product IDs. Used by the cart and wishlist. |
| `featured`, `bestSeller`, `inStock`, `onSale` | `true` | Filter when present. `onSale` means `compareAtPrice > price`. |
| `minPrice`, `maxPrice` | number | Inclusive |
| `minRating` | number | `rating >= minRating` |
| `sort` | enum | `featured` (default: featured first, then by review count), `popular` (review count), `newest`, `price-asc`, `price-desc`, `rating`, `discount` (largest % off) |
| `limit` | int | Default 12, maximum 100 |

Returns:

```json
{ "items": [Product], "total": 27, "facets": { "categories": { "electronics": 8, "fashion": 9, "accessories": 5, "home-living": 5 } } }
```

- `total` counts every match before `limit`.
- `facets.categories` counts matches per category using **every filter except `categories`**, so each option shows how many results choosing it would give.
- Unknown `ids` are left out of the results, not an error.
- The Shop page's "Load more" raises `limit` by 12 each time. That's fine at this catalogue size. Add `offset` if it grows into the hundreds.

### `GET /products/:slug`
- Returns a Product, or with `?include=details` a Product detail.
- Errors: `not_found`.

### `GET /products/:id/reviews`
```json
{
  "items": [
    { "id": "r-1", "rating": 5, "title": "…", "body": "…", "name": "Amara O.", "location": "Lagos", "date": "2026-11-09", "verified": true, "helpful": 12, "variant": "Midnight" }
  ],
  "breakdown": [{ "stars": 5, "count": 980 }, { "stars": 4, "count": 190 }, { "stars": 3, "count": 70 }, { "stars": 2, "count": 28 }, { "stars": 1, "count": 16 }]
}
```
- `items` holds the newest 8 approved reviews.
- `breakdown` covers all approved reviews, from 5 stars down to 1.
- `verified` means the reviewer bought the product.
- `variant` is the colour or size bought, or `null`.

### `GET /products/:id/related?limit=8`
- Returns `Product[]`: same-category products first, sorted by popularity, then popular products from other categories, excluding this product.

### `GET /categories`
- Returns `[{ "id", "slug", "name", "tagline", "image" }]` in display order.

### `GET /collections/:slug?sort=curated`
```json
{ "collection": { "slug": "autumn-edit", "name": "The Autumn Edit", "eyebrow": "Seasonal", "tagline": "…", "description": "…", "image": "…", "tone": "dark", "productIds": ["p-104", "…"] }, "products": [Product] }
```
- `sort=curated` keeps the collection's own order. Any other `sort` value from `GET /products` also works.
- `tone` is `dark` or `light` and sets the hero text colour.
- Errors: `not_found`.

### `GET /reviews/featured`
- Returns the homepage testimonials: `[{ "id", "name", "location", "avatar", "rating", "product", "title", "quote" }]`.
- `product` is the product's name. `avatar` is an image URL or `null`.

## 8. Orders

### `GET /me/orders` (auth)
- Returns `Order[]`, newest first. No pagination in v1.
- Include guest orders placed with the user's email **only if that email is verified**.
- Don't list orders still waiting for payment.

### `GET /orders/:id`
- Used by the order confirmation page when it's refreshed.
- Signed-in owners see their own orders.
- Guests must pass `?token=<accessToken>` (see `POST /orders` in [10](#10-new-for-launch-checkout-payments-admin)).
- Anyone else gets `not_found`, never `forbidden`, so the API doesn't reveal that the order exists.

### `POST /orders/:id/cancel` (auth, owner)
- Returns the updated Order with `status: "Cancelled"` and `cancelledAt` set.
- Allowed only while the order is `Processing`. Restock the items, and refund the payment through the provider.
- Errors: `not_cancellable`, `not_found`.

### `POST /orders`

The current frontend sends the body shown below. **It must be replaced before launch**, because it carries prices and totals worked out in the browser. Section 10 gives the launch version; this is what the code sends today:

```json
{
  "checkoutId": "57746f02-…",
  "userId": "u-demo",
  "contact": { "email": "…", "phone": "…", "marketing": false },
  "shippingAddress": Address, "billingAddress": Address,
  "shippingMethod": { "id": "standard", "label": "Standard", "eta": "3–5 business days" },
  "estimatedDelivery": "…",
  "payment": { "method": "card", "brand": "visa", "last4": "4242" },
  "items": [{ "productId": "…", "slug": "…", "name": "…", "image": "…", "price": 249, "quantity": 1, "color": null, "size": null }],
  "totals": { "subtotal": 249, "discount": 0, "shipping": 0, "total": 249 },
  "promo": Promotion
}
```

The server must ignore `userId`, `items[].price`, `totals`, `promo` and the shipping labels, and take the user from the token. It uses only product IDs, quantities, variants, the promo **code**, the shipping method **ID**, the contact details and the addresses.

## 9. Promotions, newsletter, support

### `POST /cart/promo`
```json
{ "code": "WELCOME15", "subtotal": 160 }
```
- Returns a Promotion. The code is case-insensitive; return it uppercased.
- Errors: `invalid_promo`, `promo_min_subtotal`.
- This check is only a preview. The promo is applied again when the order is quoted and placed.

### `POST /newsletter`
```json
{ "email": "ada@example.com" }
```
- Returns **200** `{ "email": "…", "subscribed": true }`.
- Subscribing twice isn't an error.
- Confirm by email (double opt-in) where the law requires it.

### `POST /support/messages`
```json
{ "name": "Ada Okafor", "email": "ada@example.com", "order": "NV-8K2Q4D7M1X", "topic": "Delivery", "message": "…at least 20 characters…" }
```
- Returns **201** `{ "ticket": "SUP-482913" }`.
- `order` is optional (an empty string when blank).
- `topic` is one of: `An order I’ve placed`, `Returns or refunds`, `Delivery`, `Payment or promo codes`, `My account`, `Product question`, `Something else`.
- Email the message to the support inbox.

---

## 10. New for launch: checkout, payments, admin

These are needed to take real money safely. The frontend doesn't call them yet; section 11 lists the changes.

### `POST /checkout/quote`

The server's authoritative price for a cart. The checkout page shows these totals instead of the ones worked out in the browser.

```json
{
  "items": [{ "productId": "p-001", "quantity": 1, "color": "Midnight", "size": null }],
  "promoCode": "NOVA10",
  "shippingMethodId": "standard",
  "country": "NG"
}
```

Returns:

```json
{
  "items": [{ "productId": "p-001", "name": "…", "image": "…", "price": 249, "quantity": 1, "color": "Midnight", "size": null, "available": true, "maxQuantity": 10 }],
  "subtotal": 249, "discount": 24.9, "shipping": 0, "shippingDiscount": 0, "total": 224.1,
  "promo": Promotion, "promoActive": true, "promoShortfall": 0,
  "shippingMethods": [{ "id": "standard", "label": "Standard", "eta": "3–5 business days", "price": 4.95, "freeOver": 100, "minDays": 3, "maxDays": 5 }],
  "quoteId": "q_…", "expiresAt": "…"
}
```

The rules match `computeTotals` in `src/utils/pricing.js` exactly, so the browser's estimate and the server's quote agree:
- Prices include tax.
- Free shipping is decided by the subtotal **before** discounts.
- A percent promo is rounded to the cent.
- A promo below its minimum is returned with `promoActive: false` and the shortfall, rather than as an error.

### `POST /orders` (launch version)

```json
{
  "checkoutId": "c3f0…",
  "quoteId": "q_…",
  "contact": { "email": "…", "phone": "…", "marketing": false },
  "shippingAddress": Address,
  "billingAddress": Address,
  "shippingMethodId": "standard",
  "items": [{ "productId": "p-001", "quantity": 1, "color": "Midnight", "size": null }],
  "promoCode": "NOVA10",
  "paymentMethod": "card"
}
```

- **`checkoutId`** is a UUID the browser creates once per cart. It's unique in the database, so a repeated request returns the existing order (**201** with the same body) instead of creating a second one. The frontend already sends it and follows these rules:
  - **Same id:** retries of the same cart, including after a reload, a timeout, a network error or a 5xx (except 501, which means nothing was created). In those cases the browser can't know whether the order was created.
  - **New id:** after a definite answer, such as `card_declined` or `validation_failed` (no order exists), after a success, or when the cart changes. So a retry can never return an order for different items.
- The server prices everything again. If the total differs from `quoteId`'s quote, it returns `price_changed`.
- It creates the order in `pending_payment` and starts a payment with the provider.

Returns **201**:

```json
{
  "order": Order,
  "accessToken": "…",
  "payment": { "provider": "paystack", "reference": "NV-8K2Q4D7M1X-1", "checkoutUrl": "https://checkout.paystack.com/…", "clientToken": null }
}
```

- The frontend opens `checkoutUrl` (a redirect or popup), or uses `clientToken` with the provider's embedded fields.
- `accessToken` lets a guest view this order (`GET /orders/:id?token=`). Return it once and store only its hash.
- Errors: `out_of_stock`, `price_changed`, `validation_failed`.

### `POST /payments/webhook/:provider`

Called by the payment provider, not the frontend.

- Verify the provider's signature.
- Record each event ID once in `payment_events`, so a repeated delivery has no effect.
- On a successful charge:
  - Mark the order `paid`, which the API shows as `Processing`.
  - Reduce stock with a conditional update. If stock ran out, refund automatically and mark the order `cancelled`.
  - Send the confirmation email.
- On a failed charge, mark the order `payment_failed`.

### Orders that are never paid

- A scheduled job cancels orders still in `pending_payment` after 30 minutes.
- Stock is reduced only when payment succeeds, so an abandoned checkout holds nothing.

### Admin

Requires a user with `role = 'admin'`. Everyone else gets `forbidden`.

| Endpoint | Purpose |
|---|---|
| `GET /admin/orders?status=` | List orders, newest first |
| `POST /admin/orders/:id/ship` `{ carrier, number }` | Sets `shipped`, `shippedAt` and `tracking`, and emails the customer |
| `POST /admin/orders/:id/deliver` | Sets `delivered` and `deliveredAt` |
| `POST /admin/orders/:id/refund` `{ amount? }` | Refunds through the provider. A full refund sets `refunded`. |
| `PATCH /admin/products/:id` | Change price, stock, compare-at price, badge, featured, published |

Manage the rest of the catalogue (new products, images, collections) with a database GUI such as Drizzle Studio or Prisma Studio until an admin UI is needed.

### Emails

Send through a transactional email provider from a background job, so a slow email never slows down a request:
- password reset
- order confirmation
- shipped (with tracking)
- cancelled or refunded
- support message received

## 11. Frontend changes these require

| # | Change | Where | Why |
|---|---|---|---|
| 1 | ✅ **Done.** `nullIfNotFound` in `api.js` turns a 404 into `null` in `productService.getDetail`, `productService.collection` and `orderService.getOrder`. Other errors still throw, and the confirmation page now shows "Try again" for them. | `src/services/*`, `OrderConfirmationPage.jsx` | The product, collection and confirmation pages each show a "not found" state for a missing item, and an error state with "Try again" for a failed request |
| 2 | Show `POST /checkout/quote` totals in checkout, and handle `price_changed` / `out_of_stock` | `CheckoutPage.jsx` | The server, not the browser, decides what's charged |
| 3 | Send the launch `POST /orders` body, then hand off to the provider's checkout. ✅ **`checkoutId` part done:** it's sent today, and a same-moment double submit is blocked in the browser. | `CheckoutPage.jsx`, `orderService.js` | Stops double orders and keeps card data out of the app |
| 4 | Replace the card fields with the provider's hosted fields or redirect. Hide PayPal and Apple Pay until they're integrated. | `PaymentMethods.jsx` | The card number must never touch NOVA's servers |
| 5 | Keep `accessToken` (in `sessionStorage`) and pass `?token=` on the confirmation page | `OrderConfirmationPage.jsx`, `orderService.js` | Guests can reload their confirmation without exposing other orders |
| 6 | Optional: read shipping methods from the quote instead of `src/data/shipping.js` | `pricing.js`, `ShippingMethods.jsx` | One source of truth for prices |
| 7 | Optional: add `GET /collections` for the collections index | `CollectionsPage.jsx` | That page reads static data today |
