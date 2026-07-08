-- CreateTable
CREATE TABLE "shipments"."PoEvent" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PoEvent_purchaseOrderId_createdAt_idx" ON "shipments"."PoEvent"("purchaseOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "shipments"."PoEvent" ADD CONSTRAINT "PoEvent_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "shipments"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

