import { prisma } from "./prisma";
import { shopifyConfigured, fetchVariantInventory, fetchSalesByDay } from "./shopify";

// Sync Shopify → local: current inventory for linked products, and daily
// sales per variant (ALL variants, so a product linked later already has
// history). Incremental: continues from the last stored sales day (re-pulling
// a 2-day overlap to catch late orders); first run backfills 90 days.
export async function runShopifySync(full = false): Promise<
  { linked: number; salesRows: number; since: string } | { error: string }
> {
  if (!shopifyConfigured()) {
    return { error: "Shopify isn't configured — set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN." };
  }
  try {
    return await doSync(full);
  } catch (e) {
    // Surface Shopify's own message (bad token, wrong domain, missing scope)
    // instead of an opaque 500 — the Sync button shows this to the user.
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("401")) {
      return {
        error:
          "Shopify rejected the credentials (401). Check that SHOPIFY_ADMIN_TOKEN is the Admin API access token (starts with shpat_) and SHOPIFY_STORE_DOMAIN is your *.myshopify.com domain — then redeploy.",
      };
    }
    if (msg.includes("403")) {
      return {
        error:
          "Shopify refused access (403). The custom app needs the read_products and read_orders scopes — update them and reinstall the app.",
      };
    }
    return { error: `Shopify sync failed: ${msg.slice(0, 300)}` };
  }
}

async function doSync(full: boolean): Promise<{ linked: number; salesRows: number; since: string }> {

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

  // Sales window: from last stored day − 2, else 90 days back. `full` forces
  // the whole 90-day window (used to repair a partial backfill).
  const last = await prisma.shopifySale.aggregate({ _max: { date: true } });
  const since =
    !full && last._max.date
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
