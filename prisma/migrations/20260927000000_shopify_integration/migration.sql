ALTER TABLE "shipments"."Product" ADD COLUMN "shopifyVariantId" TEXT;
ALTER TABLE "shipments"."Product" ADD COLUMN "shopifySku" TEXT;
ALTER TABLE "shipments"."Product" ADD COLUMN "shopifyPrice" DOUBLE PRECISION;
ALTER TABLE "shipments"."Product" ADD COLUMN "shopifyOnHand" INTEGER;
ALTER TABLE "shipments"."Product" ADD COLUMN "shopifySyncedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Product_shopifyVariantId_key" ON "shipments"."Product"("shopifyVariantId");

CREATE TABLE "shipments"."ShopifySale" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "units" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShopifySale_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShopifySale_variantId_date_key" ON "shipments"."ShopifySale"("variantId", "date");
