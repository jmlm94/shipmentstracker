# Moving the tracker to its own database

The app currently shares a Postgres database with another project (everything
lives in the `shipments` schema to keep them apart). Moving to a dedicated
database removes the risk of one project's mistake affecting the other's data.

The app now uses **Prisma migrations** (`prisma/migrations/`), so a fresh
database gets the full schema automatically on the first deploy — the move is
mostly copying data.

## Steps (~15 minutes)

### 1. Create the new database

In [Vercel](https://vercel.com) → your project → **Storage** → **Create
Database** → *Postgres* (or [console.prisma.io](https://console.prisma.io) →
new Prisma Postgres project). Copy its connection string.

### 2. Copy the data

Run locally with both connection strings (needs `pg_dump`/`psql`,
`brew install libpq` on macOS):

```bash
OLD="postgres://...old connection string..."
NEW="postgres://...new connection string..."

# Copies ONLY the shipments schema — the other project's data stays behind.
pg_dump "$OLD" --schema=shipments --no-owner --no-privileges | psql "$NEW"
```

### 3. Point the app at it

Vercel → project → **Settings → Environment Variables** → set `DATABASE_URL`
to the new connection string → **Redeploy**.

The build runs `prisma migrate deploy` (see `scripts/migrate.js`). Because the
copied data includes the `_prisma_migrations` history, the new database is
recognized as up to date. If you ever start from an *empty* database instead,
the same command creates the whole schema from the migration files.

### 4. Verify, then retire the old schema

Check the dashboard: shipments, purchase orders, products, and images should
all be there. After a few days of normal use, the old `shipments` schema in
the shared database can be dropped (from the other project's console):

```sql
DROP SCHEMA shipments CASCADE;  -- only after verifying the new DB!
```

## Notes

- **Migrations from now on:** schema changes are applied via files in
  `prisma/migrations/` at deploy time. Don't run `prisma db push` against
  production anymore — it bypasses the history.
- The very first deploy after adopting migrations "baselines" the existing
  database automatically (marks the init migration as already applied).
- If the `_prisma_migrations` table ends up in the shared database's `public`
  schema (it follows the connection's default schema), that's harmless — but
  it's one more reason to complete this move.
