-- Backfill legacy single-cost columns into PurchaseOrderCost rows before
-- dropping them. Mirrors the unifyCosts() fallback exactly: legacy values only
-- ever applied when an order had NO cost rows, so only those orders backfill.
-- Single statement so both branches see the same pre-insert snapshot.
INSERT INTO "shipments"."PurchaseOrderCost" ("id", "purchaseOrderId", "kind", "label", "amount", "sort")
SELECT gen_random_uuid()::text, po."id", 'SHIPPING'::"shipments"."PoCostKind", 'Shipping', po."shippingCost", 0
FROM "shipments"."PurchaseOrder" po
WHERE po."shippingCost" <> 0
  AND NOT EXISTS (SELECT 1 FROM "shipments"."PurchaseOrderCost" c WHERE c."purchaseOrderId" = po."id")
UNION ALL
SELECT gen_random_uuid()::text, po."id", 'OTHER'::"shipments"."PoCostKind", COALESCE(po."otherCostLabel", 'Other'), po."otherCost", 1
FROM "shipments"."PurchaseOrder" po
WHERE po."otherCost" <> 0
  AND NOT EXISTS (SELECT 1 FROM "shipments"."PurchaseOrderCost" c WHERE c."purchaseOrderId" = po."id");

-- DropForeignKey
ALTER TABLE "shipments"."ExpectedItem" DROP CONSTRAINT "ExpectedItem_arrivalId_fkey";

-- AlterTable
ALTER TABLE "shipments"."PurchaseOrder" DROP COLUMN "otherCost",
DROP COLUMN "otherCostLabel",
DROP COLUMN "shippingCost";

-- DropTable
DROP TABLE "shipments"."ExpectedArrival";

-- DropTable
DROP TABLE "shipments"."ExpectedItem";

-- DropEnum
DROP TYPE "shipments"."ExpectedStatus";
