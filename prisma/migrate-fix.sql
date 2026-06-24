-- One-time, self-disabling migration guard.
--
-- The app's schema was overhauled (per-SKU lines, per-box carrier/method, box
-- codes, reordered Carrier enum). `prisma db push` can't transform the old
-- `shipments` tables in place, so if the OLD structure is still present we drop
-- the `shipments` schema and let `db push` recreate it fresh.
--
-- This only fires while `shipments.Shipment` still has the old `carrier` column
-- (i.e. before the overhaul has ever been applied). Once the new schema is in
-- place that column no longer exists, so this becomes a permanent no-op and is
-- safe to keep in the build. It NEVER touches the `public` schema (other
-- projects' data such as the `Creative` table).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'shipments'
      AND table_name = 'Shipment'
      AND column_name = 'carrier'
  ) THEN
    DROP SCHEMA shipments CASCADE;
  END IF;
END $$;
