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
