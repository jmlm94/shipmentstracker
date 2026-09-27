import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  variants: z
    .array(
      z.object({
        variantId: z.string().min(1),
        productTitle: z.string().min(1),
        variantTitle: z.string().optional().default(""),
        sku: z.string().optional().default(""),
        price: z.coerce.number().optional().default(0),
        inventory: z.coerce.number().int().optional().default(0),
        image: z.string().optional().default(""),
      })
    )
    .min(1)
    .max(300),
});

// Manually add selected Shopify variants to the tracker's product catalog,
// pre-linked to their store variant.
export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  let created = 0;
  let skipped = 0;
  for (const v of parsed.data.variants) {
    const exists = await prisma.product.findFirst({ where: { shopifyVariantId: v.variantId } });
    if (exists) {
      skipped++;
      continue;
    }
    const name =
      v.variantTitle && v.variantTitle !== "Default Title"
        ? `${v.productTitle} – ${v.variantTitle}`
        : v.productTitle;
    await prisma.product.create({
      data: {
        name,
        sku: v.sku || null,
        image: v.image || null,
        source: "shopify",
        shopifyVariantId: v.variantId,
        shopifySku: v.sku || null,
        shopifyPrice: v.price || null,
        shopifyOnHand: v.inventory,
        shopifySyncedAt: new Date(),
      },
    });
    created++;
  }
  return NextResponse.json({ ok: true, created, skipped });
}
