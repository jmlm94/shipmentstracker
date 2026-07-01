-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "shipments";

-- CreateEnum
CREATE TYPE "shipments"."PoCostKind" AS ENUM ('SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "shipments"."PoStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "shipments"."Carrier" AS ENUM ('UPS', 'FEDEX', 'USPS', 'DHL', 'OTHER');

-- CreateEnum
CREATE TYPE "shipments"."ShippingMethod" AS ENUM ('AIR', 'SEA');

-- CreateEnum
CREATE TYPE "shipments"."BoxStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELAYED', 'DELIVERED', 'DAMAGED', 'ADDED_IN_STOCK', 'LOST');

-- CreateEnum
CREATE TYPE "shipments"."BoxCondition" AS ENUM ('GOOD', 'LOST_UNITS');

-- CreateEnum
CREATE TYPE "shipments"."ExpectedStatus" AS ENUM ('EXPECTED', 'ARRIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "shipments"."Shipment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "poNumber" TEXT,
    "supplierName" TEXT NOT NULL,
    "supplierEmail" TEXT,
    "shipmentDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "boxesTotal" INTEGER NOT NULL,
    "manuallyAdded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "purchaseOrderId" TEXT,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."PurchaseOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierEmail" TEXT,
    "supplierContact" TEXT,
    "status" "shipments"."PoStatus" NOT NULL DEFAULT 'OPEN',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCostLabel" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."PoNote" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "text" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."PoPayment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "amount" DOUBLE PRECISION,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."PurchaseOrderCost" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "kind" "shipments"."PoCostKind" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."ShipmentLine" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "productImage" TEXT,
    "boxCount" INTEGER NOT NULL,
    "unitsPerBox" INTEGER NOT NULL,
    "weightPerBox" DOUBLE PRECISION NOT NULL,
    "shippingMethod" "shipments"."ShippingMethod" NOT NULL,
    "carrier" "shipments"."Carrier" NOT NULL,
    "trackingPerBox" BOOLEAN NOT NULL DEFAULT false,
    "trackingNumber" TEXT,

    CONSTRAINT "ShipmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."Box" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "boxCode" TEXT NOT NULL,
    "boxNumber" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT,
    "productImage" TEXT,
    "trackingNumber" TEXT NOT NULL,
    "unitsPerBox" INTEGER NOT NULL,
    "weightOfBox" DOUBLE PRECISION NOT NULL,
    "shippingMethod" "shipments"."ShippingMethod" NOT NULL,
    "carrier" "shipments"."Carrier" NOT NULL,
    "status" "shipments"."BoxStatus" NOT NULL DEFAULT 'PENDING',
    "weightReceived" DOUBLE PRECISION,
    "condition" "shipments"."BoxCondition",
    "unitsReceived" INTEGER,
    "receivedBy" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "overdueNotifiedAt" TIMESTAMP(3),
    "hasDiscrepancy" BOOLEAN NOT NULL DEFAULT false,
    "lastCarrierStatus" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."BoxPhoto" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoxPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."StatusEvent" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "message" TEXT,
    "source" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."ExpectedArrival" (
    "id" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "status" "shipments"."ExpectedStatus" NOT NULL DEFAULT 'EXPECTED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpectedArrival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."ExpectedItem" (
    "id" TEXT NOT NULL,
    "arrivalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT,
    "expectedUnits" INTEGER NOT NULL,

    CONSTRAINT "ExpectedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments"."SyncRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "boxesChecked" INTEGER NOT NULL DEFAULT 0,
    "statusChanges" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "trigger" TEXT NOT NULL DEFAULT 'cron',

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_code_key" ON "shipments"."Shipment"("code");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "shipments"."Shipment"("createdAt");

-- CreateIndex
CREATE INDEX "Shipment_code_idx" ON "shipments"."Shipment"("code");

-- CreateIndex
CREATE INDEX "Shipment_purchaseOrderId_idx" ON "shipments"."Shipment"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON "shipments"."PurchaseOrder"("code");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "shipments"."PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_code_idx" ON "shipments"."PurchaseOrder"("code");

-- CreateIndex
CREATE INDEX "PoNote_purchaseOrderId_idx" ON "shipments"."PoNote"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PoPayment_purchaseOrderId_idx" ON "shipments"."PoPayment"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "shipments"."PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderCost_purchaseOrderId_idx" ON "shipments"."PurchaseOrderCost"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "ShipmentLine_shipmentId_idx" ON "shipments"."ShipmentLine"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Box_boxCode_key" ON "shipments"."Box"("boxCode");

-- CreateIndex
CREATE INDEX "Box_shipmentId_idx" ON "shipments"."Box"("shipmentId");

-- CreateIndex
CREATE INDEX "Box_lineId_idx" ON "shipments"."Box"("lineId");

-- CreateIndex
CREATE INDEX "Box_status_idx" ON "shipments"."Box"("status");

-- CreateIndex
CREATE INDEX "Box_boxCode_idx" ON "shipments"."Box"("boxCode");

-- CreateIndex
CREATE INDEX "Box_trackingNumber_idx" ON "shipments"."Box"("trackingNumber");

-- CreateIndex
CREATE INDEX "BoxPhoto_boxId_idx" ON "shipments"."BoxPhoto"("boxId");

-- CreateIndex
CREATE INDEX "StatusEvent_boxId_idx" ON "shipments"."StatusEvent"("boxId");

-- CreateIndex
CREATE INDEX "StatusEvent_createdAt_idx" ON "shipments"."StatusEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "shipments"."Product"("sku");

-- CreateIndex
CREATE INDEX "ExpectedArrival_status_idx" ON "shipments"."ExpectedArrival"("status");

-- CreateIndex
CREATE INDEX "ExpectedItem_arrivalId_idx" ON "shipments"."ExpectedItem"("arrivalId");

-- CreateIndex
CREATE INDEX "SyncRun_startedAt_idx" ON "shipments"."SyncRun"("startedAt");

-- AddForeignKey
ALTER TABLE "shipments"."Shipment" ADD CONSTRAINT "Shipment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "shipments"."PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."PoNote" ADD CONSTRAINT "PoNote_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "shipments"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."PoPayment" ADD CONSTRAINT "PoPayment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "shipments"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "shipments"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."PurchaseOrderCost" ADD CONSTRAINT "PurchaseOrderCost_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "shipments"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."ShipmentLine" ADD CONSTRAINT "ShipmentLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"."Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."Box" ADD CONSTRAINT "Box_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"."Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."Box" ADD CONSTRAINT "Box_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "shipments"."ShipmentLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."BoxPhoto" ADD CONSTRAINT "BoxPhoto_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "shipments"."Box"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."StatusEvent" ADD CONSTRAINT "StatusEvent_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "shipments"."Box"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments"."ExpectedItem" ADD CONSTRAINT "ExpectedItem_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "shipments"."ExpectedArrival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

