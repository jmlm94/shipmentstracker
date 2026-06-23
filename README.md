# Shipments Tracker

A smart intake form for suppliers + a warehouse tracking dashboard, hosted on
Vercel. Suppliers submit **every box** they ship (one tracking number per box);
the team tracks each box from dispatch → in transit → delivered → added in
stock. Status changes post to Slack, and a daily cron refreshes carrier
tracking automatically.

Built from the *Inbound & Outbound Warehouse SOP*.

## What's here

| Route | Who | Purpose |
| --- | --- | --- |
| `/submit` | Suppliers | Strict, per-box intake form. Send this link with every shipment. |
| `/dashboard` | CEO / COO | Live view of every shipment & box, status filters, search. |
| `/dashboard/[id]` | CEO / COO | Per-box detail + manual status updates (warehouse receiving). |
| `/api/cron/refresh-tracking` | System | Daily carrier-tracking refresh (Vercel Cron). |

### Fields captured (from the SOP)

- **Shipment:** supplier, email, shipment date, carrier (FedEx/DHL/UPS),
  method (Air/Sea), notes.
- **Per box:** Product ID (SKU), product name, tracking number (unique),
  units per box, weight of box.
- **Warehouse receiving:** status (Pending, In transit, Delayed, Delivered,
  Added in stock, Lost), weight received, units received, condition
  (Good / Lost units).

## Tech stack

Next.js 14 (App Router) · Prisma + PostgreSQL · Tailwind · Zod · Vercel Cron.

## Local setup

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL + DASHBOARD_PASSWORD
npm run db:push             # create tables
npm run dev                 # http://localhost:3000
```

## Deploy to Vercel

1. **Import the repo** into Vercel.
2. **Add a Postgres database** (Storage tab → Neon / Vercel Postgres). It sets
   `DATABASE_URL` automatically.
3. **Set environment variables** (Project → Settings → Environment Variables):
   - `DASHBOARD_PASSWORD` — shared password for the dashboard.
   - `SLACK_WEBHOOK_URL` — *(optional)* Slack Incoming Webhook for notifications.
   - `TRACKING_PROVIDER` — `easypost` or `none` (default).
   - `EASYPOST_API_KEY` — *(if using EasyPost)* one key tracks FedEx/UPS/DHL.
   - `CRON_SECRET` — any random string; protects the cron endpoint.
4. **Push the schema** once: run `npx prisma db push` locally against the
   production `DATABASE_URL`, or add it as a build step.
5. The daily cron is already configured in `vercel.json` (runs 13:00 UTC).

## How notifications work

Every status change writes a `StatusEvent` and posts to Slack
(`lib/slack.ts`). Sources:

- **supplier** — new shipment submitted.
- **carrier** — daily cron detects movement (in transit, delivered, delayed).
- **warehouse** — staff update a box on the dashboard (received, added in
  stock, lost units).

Without `SLACK_WEBHOOK_URL` set, notifications are logged instead of sent, so
the app runs fine before Slack is wired up.

## Carrier tracking

`lib/tracking/` is a pluggable provider. The included EasyPost adapter tracks
all three carriers with a single API key. Set `TRACKING_PROVIDER=none` to run
manual-only (status updated by warehouse staff at receiving).

## Roadmap / not yet built

- Per-SKU QR box labels (the SOP's printable 4×6 label).
- Sortly / Shopify purchase-order sync.
- Email confirmation to suppliers on submit.
