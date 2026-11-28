# Costs, budgets and alerts

Every service NOVA runs on can bill by usage, and a bug, a bot or a sudden spike can multiply that bill overnight. This page lists what costs money, the budget and alerts to set on each service, and a monthly check. Set the budgets up **when you sign up for each service**, not after the first surprising invoice.

Prices change; check each provider's pricing page rather than numbers written here.

## What costs money

| Service | What it does | What drives the bill | Status |
|---|---|---|---|
| Vercel | Serves the storefront | Plan seats, requests, data transfer, build minutes | Live |
| API host (Render, Railway, Fly.io…) | Runs the API | Instance size × number of instances × hours | Not chosen |
| Managed PostgreSQL | The database | Instance size, storage, backups and point-in-time recovery, connections | Not chosen |
| Email provider | Reset, verification and security emails | Emails sent | Not chosen |
| Payment provider | Checkout | A percentage of each payment (a cost of sales, not hosting) | Not chosen |
| Product images | Currently Unsplash, free | Once you host your own photos: storage and transfer on an image CDN | Later |

What the code already does to keep usage down: catalogue answers are cacheable for a minute (docs/API.md, section 7), built files are cached for a year, product lists skip counts they don't need, sessions are written at most once an hour, and search uses an index.

## Before launch

### Vercel

1. **Check the plan.** Vercel → the team's **Settings** → **Billing**. Vercel's Hobby plan is for personal, non-commercial projects. A shop taking real orders needs **Pro** (or Enterprise).
2. **Set a spending limit** (Pro): **Settings** → **Billing** → **Spend Management**. Turn it on, set the monthly amount you're willing to spend beyond what the plan includes, and keep the email notifications on: they warn you as spending approaches the limit.
3. **Decide what happens at the limit.** Spend Management can pause your projects when the amount is reached. For a shop, an outage can cost more than the overage, so the usual choice is: **notify, don't pause**, with the amount set high enough to catch a runaway, not normal growth.
4. **Look at Usage once a week** for the first month (**Usage** tab), to learn what normal looks like.

### API host and database

When you choose them:

1. Set a **budget with email alerts** at 50%, 75% and 100% of the monthly amount you expect. Most providers call this "billing alerts", "budgets" or "spend limits".
2. **Turn off autoscaling, or cap it** at a maximum number of instances. Without a cap, a traffic spike or a bot can add instances, and cost, without limit. Keep `instances × DB_POOL_MAX` within the database's connection limit (server/README.md, "Before production").
3. Note what **point-in-time recovery** and backup retention cost on the database plan. They're worth it (docs/BACKUPS.md), but they shouldn't be a surprise.

### Email

Set the provider's sending limit or alert. A bug that sends emails in a loop is the most common way a small app gets an unexpected email bill or a suspended sending account.

The API has its own ceiling as well (docs/API.md, 9a): at most 5 emails per address per hour and 2,000 a day (`EMAIL_PER_ADDRESS_PER_HOUR`, `EMAIL_DAILY_LIMIT`). Set the daily limit to roughly twice your normal busiest day, and below what you'd be upset to pay for: at 80% it logs a warning; past it, it stops sending and logs an error per dropped email. Set the provider's own alert a little above it, so the API's limit trips first.

## Cost per feature

What each feature uses, from the code. Fill in the unit prices once the providers are chosen, then multiply by how often shoppers use each feature (the usage summary below gives the counts).

**Emails** (billed per message):

| Feature | Emails each time | Notes |
|---|---|---|
| Registration | 1 | The verification link |
| Resending the verification link | 1 | At most 3 per account per 15 minutes |
| Password reset | 2 | The link, then the "password changed" notice |
| Changing the password | 1 | The "password changed" notice |
| Changing the email | 2 | A notice to the old address, a link to the new one |
| Support message | 1 | To the support inbox |
| Placing an order (with checkout) | About 2 | Confirmation and shipping notice, once built |

*Per user per month* = emails per user per month × the provider's price per email. For example, a shopper who registers, resets their password once and places one order uses about 5 emails; at a price of *P* per 1,000 emails, that's 5 × *P* / 1,000.

**API and database** (billed by instance size and hours, not per request): one home page view makes 5 API calls and 14 database queries; a product page makes 4 calls. Catalogue answers can be cached at a CDN for a minute, so repeat views cost less. Hosting is mostly a fixed monthly cost: divide it by monthly active users for a per-user figure, and use the usage summary's request totals to see when traffic will outgrow the current instance size.

**Storefront** (Vercel): static files from Vercel's CDN. Built files are cached for a year, so a returning shopper mostly downloads only the page itself.

## Usage dashboard and alerts

Each API instance logs one **`Usage summary`** line an hour (and one at shutdown), with:
- `requests.total`, `.errors` (5xx), `.limited` (429) and `.slow` (1 second or more);
- `requests.routes`: the 25 busiest routes by pattern (`/api/products/:slug`), each with count, errors, limited, slow and average time;
- `emails.sent`, `.failed`, `.droppedPerAddress` and `.droppedDaily`;
- `instance`, `from` and `to`.

Send the API's logs to a log service (Vercel log drains, Better Stack, Datadog or Axiom), then build:

| Chart or alert | From |
|---|---|
| Requests per hour | Sum of `requests.total` across instances |
| Busiest and slowest routes | `requests.routes`, by count and by `avgMs` |
| Emails per day, against the ceiling | Sum of `emails.sent` per day, compared with `EMAIL_DAILY_LIMIT` |
| **Alert: email ceiling reached** | Any `Email not sent: daily email limit reached` line. Act straight away: verification and reset emails have stopped. |
| **Alert: email ceiling at 80%** | `Emails today have reached 80% of the daily limit` |
| **Alert: abuse** | `requests.limited` or `emails.droppedPerAddress` well above normal |
| **Alert: email provider failing** | `emails.failed` above 0 |

## Signs of a cost problem in the logs

The API's logs (server/README.md, "Logs, errors and health") show these before the invoice does:

- **Many more `Request` lines than usual**, especially from one IP or one path: a bot or a crawler. The rate limits slow down login and forms, not the catalogue.
- **Many `429 rate_limited` lines**: someone is hammering a protected endpoint.
- **`Slow request` warnings**: queries getting slower as data grows, which usually means a bigger database plan is coming unless an index is added.
- **A memory figure in `/api/health/ready` that keeps rising**: an instance sized too small, or a leak.

## Monthly check

Once a month, ten minutes, and add a line below:

1. Open each service's billing page. Compare the total with last month and with the budget.
2. If anything grew more than traffic did, find out why before the next invoice.
3. Check the budgets and alerts are still on (a plan change can reset them).

| Month | Vercel | API host | Database | Email | Total | Notes |
|---|---|---|---|---|---|---|
| | | | | | | No services billed yet |
