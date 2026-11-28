# Rolling back a bad deploy

When a deploy breaks the live site, put the last good version back first and investigate afterwards. A rollback takes under a minute; fixing forward under pressure usually takes longer.

## Storefront (Vercel)

Every deploy is kept, so going back means pointing the domain at an older build. Nothing is rebuilt.

**One click:** Vercel → the `nova-store` project → **Deployments** → find the last good **Production** deployment → **⋯** → **Instant Rollback** → confirm. The site switches within seconds.

**One command** (needs `npm i -g vercel` and `vercel login` once):

```bash
vercel rollback                    # back to the previous production deployment
vercel rollback <deployment-url>   # back to a specific one
vercel rollback status             # check that it finished
```

**Then:**
1. Load the site, refresh a deep link such as `/shop`, and check that the bug is gone.
2. Revert the bad commit on `main` (`git revert <sha>`, through a pull request) or fix it.
3. **Turn automatic deploys back on.** After a rollback, Vercel stops sending new `main` deploys to production. Until you do this step, merges build but don't go live. Click **Undo Rollback** on the project page, or promote the fixed deployment: **⋯** → **Promote**, or `vercel promote <deployment-url>`.

On the Hobby plan, Instant Rollback only goes back to the previous production deployment. To go further back, promote an older deployment instead.

A rollback also brings back that deployment's `vercel.json`, so its security headers and rewrites change with it.

## API (once it's hosted)

The API isn't deployed yet. When you pick a host, choose one that keeps earlier releases and can switch back in one step (Render, Railway and Fly.io all can), and add the exact steps here.

The code rolls back easily; **the database doesn't**. Migrations only run forward, so the previous API version has to keep working on the new schema. Write every migration to allow that:

- **Adding** a table, a column that can be empty or has a default, or an index: safe.
- **Renaming or removing** something: do it in two releases. The first stops using it; the second, once you no longer need to roll back to anything older, removes it.
- **A new constraint** (CHECK, UNIQUE, NOT NULL): check that the previous version never writes data that breaks it.

Before a release with a migration, take a backup: `npm run db:backup` (see [BACKUPS.md](BACKUPS.md)). Restoring a backup loses every order placed since it was taken, so use it only when data is damaged, never as the normal way to undo a deploy.

## Practising

Run a drill before launch and again every few months, so the first rollback isn't during an outage:

1. Merge a harmless visible change (for example, a word in the footer) and wait for it to go live.
2. Roll back with the button or the command above, and time how long the old version takes to appear.
3. Undo the rollback, and check that the next merge to `main` goes live by itself.
4. Add a line below.

| Date | Who | What was rolled back | Time to recover | Notes |
|---|---|---|---|---|
| | | | | Not practised yet |
