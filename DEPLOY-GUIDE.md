# Deploying DLI Brand Hub with a real database — corrected for your setup

Your Cloudflare project (`dli-brand-hub`) was created as a **Worker with
static assets**, deployed via `npx wrangler deploy` — you can see this in
your build log ("Deploy command: npx wrangler deploy", "Worker Name:
dli-brand-hub"). That's a fine, modern way to run this site — but it means
the **dashboard's "Add binding" button doesn't actually control anything**
for this project. The real configuration lives in a file called
`wrangler.toml` that must be committed to your GitHub repo. That's why
clicking "Add Binding" appeared to do nothing: it wasn't wrong, it just
wasn't the right control for this project type.

This package fixes that by giving you the `wrangler.toml` file itself.

**New file layout** (replaces what you have in the repo now):
```
public/
  index.html        <- the site (moved into a subfolder)
src/
  worker.js         <- handles /api/state and /api/verify, serves the site
wrangler.toml        <- the real config: D1 binding + assets folder
schema.sql
DEPLOY-GUIDE.md
```

---

## Step 1 — Find your D1 database ID

1. Cloudflare dashboard → **Storage & databases → D1 SQLite Database →
   dli-brand-hub-db**.
2. On the **Overview** tab, find **Database ID** — a long string like
   `a1b2c3d4-....`. Copy it.

## Step 2 — Put that ID into wrangler.toml

Open `wrangler.toml` in this package and replace:
```
database_id = "PASTE-YOUR-DATABASE-ID-HERE"
```
with the ID you copied, e.g.:
```
database_id = "a1b2c3d4-5678-90ab-cdef-1234567890ab"
```

## Step 3 — Create the database table (if you haven't already)

If you already ran this in the D1 Console earlier, skip this step.
Otherwise, in the D1 database's **Console** tab, run:
```sql
CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## Step 4 — Replace the repo contents on GitHub

In your local clone of `dlimarketing-ae/DLi_brand_HUB`:
1. Delete the old `index.html` from the repo root and the old `functions/`
   folder if present (no longer used by this deploy type).
2. Copy in this package's `public/`, `src/`, and `wrangler.toml`, plus
   `schema.sql`.
3. Commit and push:
   ```
   git add .
   git commit -m "Add D1-backed API and fix wrangler config"
   git push
   ```
   No local `git`? Use GitHub's web UI — delete the old files and drag the
   new ones into the repo, matching the folder layout above exactly.

Pushing to `main` triggers Cloudflare to run `npx wrangler deploy` again —
this time it will read `wrangler.toml` and actually attach the D1 database.

## Step 5 — Set the admin passcode

This one **does** work through the dashboard, but on a different tab than
the one you were on:

1. Go to `dli-brand-hub` → **Settings → Variables and Secrets** (not
   "Bindings" — that tab is only for resource bindings like D1/KV/R2,
   which we're now handling through `wrangler.toml` instead).
2. Add a variable:
   - **Name:** `ADMIN_TOKEN`
   - **Value:** a strong passphrase — this is what you'll type into the
     site's admin login.
   - Click the option to encrypt it / mark it as a **Secret**.
3. Save.

## Step 6 — Watch the deploy

After pushing in Step 4, go to **Deployments** and watch the new build.
Once it finishes, open **Overview → Bindings** — it should now show
**1 binding** (`DB`) instead of 0, without you having touched that tab.

## Step 7 — Test it

1. Visit your live URL (the `.workers.dev` one, or your custom domain).
2. Hover the bottom-left corner → click the lock icon → log in with the
   `ADMIN_TOKEN` value from Step 5.
3. Make a change (edit a heading, upload a logo).
4. Open the same URL in an **incognito window**. The change should be
   there — that confirms the database is actually being read and written.

---

## Why this happened

Cloudflare has two different ways to run a "Workers & Pages" project:
- **Classic Pages** (Git-connected, auto-detects a `/functions` folder,
  bindings managed entirely through the dashboard)
- **Workers with static assets** (Git-connected, deploys by running
  `wrangler deploy`, configuration lives in `wrangler.toml` in your repo)

Your project landed in the second category. Both are legitimate, actively
supported ways to run this site — this guide just needed to match the one
you actually have instead of assuming the other.

## Notes and limits

- **Security:** the admin passcode is checked server-side against
  `ADMIN_TOKEN` — never shipped in the page's HTML/JS.
- **File size:** uploads are capped at 15 MB each and stored as base64
  text inside one JSON blob in D1. Fine for logos/PDFs/brochures at
  normal volume; a future move to **Cloudflare R2** for file storage would
  be the next step if that volume grows a lot.
- **Ongoing code changes:** any future edit to `src/worker.js` or
  `public/index.html` just needs `git push` — Cloudflare redeploys
  automatically.
- **Export/Import JSON** in the admin panel still works as a manual
  backup/restore option alongside the database.
