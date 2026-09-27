import { prisma } from "./prisma";
import { shopifyConfigured, fetchVariantInventory, fetchSalesByDay } from "./shopify";

// Sync Shopify → local: current inventory for linked products, and daily
// sales per variant (ALL variants, so a product linked later already has
// history). Incremental: continues from the last stored sales day (re-pulling
// a 2-day overlap to catch late orders); first run backfills 90 days.
export async function runShopifySync(): Promise<
  { linked: number; salesRows: number; since: string } | { error: string }
> {
  if (!shopifyConfigured()) {
    return { error: "Shopify isn't configured — set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN." };
  }

  const linked = await prisma.product.findMany({
    where: { shopifyVariantId: { not: null } },
    select: { id: true, shopifyVariantId: true },
  });

  // Inventory for linked variants.
  if (linked.length > 0) {
    const inv = await fetchVariantInventory(linked.map((p) => p.shopifyVariantId!));
    for (const p of linked) {
      const v = inv.get(p.shopifyVariantId!);
      if (v) {
        await prisma.product.update({
          where: { id: p.id },
          data: { shopifyOnHand: v.inventory, shopifyPrice: v.price, shopifySyncedAt: new Date() },
        });
      }
    }
  }

  // Sales window: from last stored day − 2, else 90 days back.
  const last = await prisma.shopifySale.aggregate({ _max: { date: true } });
  const since = last._max.date
    ? new Date(last._max.date.getTime() - 2 * 86400e3)
    : new Date(Date.now() - 90 * 86400e3);
  const sinceISO = since.toISOString().slice(0, 10);

  const sales = await fetchSalesByDay(sinceISO);
  let rows = 0;
  for (const [variantId, perDay] of sales) {
    for (const [day, units] of perDay) {
      await prisma.shopifySale.upsert({
        where: { variantId_date: { variantId, date: new Date(day) } },
        create: { variantId, date: new Date(day), units },
        update: { units },
      });
      rows++;
    }
  }

  return { linked: linked.length, salesRows: rows, since: sinceISO };
}
