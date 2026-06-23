# Deployment guide — step by step

This gets your Shipments Tracker live on Vercel. It's all clicking in
dashboards — **no terminal or coding required**. Budget ~20 minutes.

You'll set up three accounts: **Vercel** (hosting), a **Postgres database**
(via Vercel), and **EasyPost** (carrier tracking). Slack can be added later.

---

## Step 1 — Create a Vercel account & import the project

1. Go to **https://vercel.com** and sign up (use "Continue with GitHub" so it
   can see this repository).
2. On your Vercel dashboard click **Add New… → Project**.
3. Find **`shipmentstracker`** in the list and click **Import**.
4. **Important:** on the import screen, change the **Branch** (or "Production
   Branch" under Git settings) to **`claude/youthful-bardeen-1az4d6`** — that's
   where the app lives right now. (Once we merge it to `main`, you can switch
   this back to `main`.)
5. **Don't click Deploy yet.** First we add the database and settings below. If
   you already clicked Deploy and it failed, that's expected — it just needs the
   database from Step 2. We'll redeploy at the end.

---

## Step 2 — Add a Postgres database (1 click)

1. In your new project, open the **Storage** tab.
2. Click **Create Database → Postgres** (this is Neon, managed by Vercel).
   Pick the free plan, choose a region near your warehouse, click **Create**.
3. When asked to connect it to the project, click **Connect**. This
   automatically adds the `DATABASE_URL` setting for you — you don't copy
   anything.

The app creates its own tables automatically on the first deploy, so there's
nothing else to do here.

---

## Step 3 — Get your EasyPost tracking key

EasyPost tracks FedEx, UPS, and DHL with one key.

1. Go to **https://easypost.com** and sign up.
2. In their dashboard, open **API Keys** (usually under your account name /
   Settings).
3. Copy your **Production API Key** (starts with `EZ...`). Use *Production*,
   not *Test*, so it tracks real packages.

> EasyPost has a free tier for tracking. You only need the key — no other setup.

---

## Step 4 — Add your settings (environment variables)

In your Vercel project: **Settings → Environment Variables**. Add each of these
(set the Environment to **Production, Preview, and Development** for each), then
**Save**:

| Name | Value | What it's for |
| --- | --- | --- |
| `DASHBOARD_PASSWORD` | *(a strong password you choose)* | The password you + your COO use to open the dashboard. |
| `TRACKING_PROVIDER` | `easypost` | Turns on EasyPost auto-tracking. |
| `EASYPOST_API_KEY` | *(the `EZ...` key from Step 3)* | Lets the app read carrier status. |
| `CRON_SECRET` | *(any random text, e.g. mash the keyboard)* | Protects the daily auto-update job. |

`DATABASE_URL` is already there from Step 2 — leave it alone.

> Skipping Slack for now is fine: with no Slack setting, notifications are just
> recorded internally. When you're ready, add one variable named
> `SLACK_WEBHOOK_URL` and notifications start flowing — no code change needed.

---

## Step 5 — Deploy

1. Go to the **Deployments** tab → **Redeploy** (or **Deployments → … →
   Redeploy** on the latest). If this is the first deploy, just click **Deploy**.
2. Wait ~2 minutes. On success you'll get a URL like
   `https://shipmentstracker.vercel.app`.

The daily tracking refresh (the cron job) is already scheduled — Vercel turns it
on automatically from the included `vercel.json`. It runs once a day at 13:00
UTC. Nothing to configure.

---

## Step 6 — Try it end to end

1. **Supplier form:** open `https://YOUR-URL/submit`. Fill in a fake shipment
   with 2–3 boxes and submit. This is the exact link you'll send suppliers.
2. **Dashboard:** open `https://YOUR-URL/dashboard`, enter your
   `DASHBOARD_PASSWORD`, and you'll see the shipment. Click it to see each box,
   and use **Update** on a box to mark it Delivered / Added in stock, record the
   weight received, or flag lost units.
3. Tomorrow (after the cron runs) any boxes with real tracking numbers will show
   updated carrier status automatically.

---

## What to send your suppliers

> "Every time you ship to us, fill out this form — **one row per box**, with
> each box's tracking number, SKU, unit count, and weight:
> **https://YOUR-URL/submit**"

---

## Common questions

- **"Build failed."** Almost always means the database wasn't connected before
  deploying. Do Step 2, then redeploy.
- **"I want a custom domain"** (e.g. `track.yourcompany.com`): Vercel project →
  **Settings → Domains → Add**.
- **"Change the daily run time"**: edit the `schedule` in `vercel.json`
  (it's in cron format, UTC) — tell me the time you want and I'll set it.
- **Adding more team members**: share the dashboard URL + password, or invite
  them to the Vercel project so they can see logs.
