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
  const params = new URL(req.url).searchParams;
  const apply = params.get("apply") === "1";
  const minScore = params.get("min") ? Number(params.get("min")) : 0;
  // Explicit single link: ?product=<id>&variant=<gid> (for pairs the fuzzy
  // matcher can't safely decide).
  const directProduct = params.get("product");
  const directVariant = params.get("variant");

  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, shopifyVariantId: true },
  });
  const linkedVariantIds = new Set(
    products.map((p) => p.shopifyVariantId).filter(Boolean) as string[]
  );
  const unlinked = products.filter((p) => !p.shopifyVariantId);
  const variants = (await listStoreVariants()).filter((v) => !linkedVariantIds.has(v.variantId));

  if (directProduct && directVariant) {
    const v = variants.find((x) => x.variantId === directVariant);
    const prod = products.find((x) => x.id === directProduct);
    if (!v || !prod) {
      return NextResponse.json({ error: "Unknown product or variant" }, { status: 404 });
    }
    await prisma.product.update({
      where: { id: directProduct },
      data: {
        shopifyVariantId: v.variantId,
        shopifySku: v.sku || null,
        shopifyPrice: v.price || null,
        shopifyOnHand: v.inventory,
        shopifySyncedAt: new Date(),
      },
    });
    return NextResponse.json({ applied: true, linked: `${prod.name} → ${v.productTitle} – ${v.variantTitle}` });
  }

  const suggestions = suggestLinks(
    unlinked,
    variants.map((v) => ({
      variantId: v.variantId,
      productTitle: v.productTitle,
      variantTitle: v.variantTitle,
      sku: v.sku,
    }))
  );

  const toApply = suggestions.filter((s) => s.score >= minScore);
  if (apply) {
    const byId = new Map(variants.map((v) => [v.variantId, v]));
    for (const s of toApply) {
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

  return NextResponse.json({
    applied: apply,
    appliedCount: apply ? toApply.length : 0,
    suggestions,
    belowCutoff: suggestions.filter((s) => s.score < minScore).map((s) => s.productName),
    stillUnlinked,
  });
}
