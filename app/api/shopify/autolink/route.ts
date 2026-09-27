import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shopifyConfigured, listStoreVariants } from "@/lib/shopify";
import { suggestLinks } from "@/lib/matchProducts";
import { logPoEvent } from "@/lib/poLog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Maintenance: propose (and with ?apply=1, write) links between unlinked
// tracker products and unmatched store variants, using SKU / exact-name /
// fuzzy-name matching. Gated like the cron routes via CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!shopifyConfigured()) {
    return NextResponse.json({ error: "Shopify isn't configured." }, { status: 503 });
  }
  const apply = new URL(req.url).searchParams.get("apply") === "1";

  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, shopifyVariantId: true },
  });
  const linkedVariantIds = new Set(
    products.map((p) => p.shopifyVariantId).filter(Boolean) as string[]
  );
  const unlinked = products.filter((p) => !p.shopifyVariantId);
  const variants = (await listStoreVariants()).filter((v) => !linkedVariantIds.has(v.variantId));

  const suggestions = suggestLinks(
    unlinked,
    variants.map((v) => ({
      variantId: v.variantId,
      productTitle: v.productTitle,
      variantTitle: v.variantTitle,
      sku: v.sku,
    }))
  );

  if (apply) {
    const byId = new Map(variants.map((v) => [v.variantId, v]));
    for (const s of suggestions) {
      const v = byId.get(s.variantId)!;
      await prisma.product.update({
        where: { id: s.productId },
        data: {
          shopifyVariantId: s.variantId,
          shopifySku: v.sku || null,
          shopifyPrice: v.price || null,
          shopifyOnHand: v.inventory,
          shopifySyncedAt: new Date(),
        },
      });
    }
  }

  const stillUnlinked = unlinked
    .filter((p) => !suggestions.some((s) => s.productId === p.id))
    .map((p) => p.name);

  return NextResponse.json({ applied: apply, suggestions, stillUnlinked });
}
