import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable(), // null unlinks
  sku: z.string().optional().default(""),
  price: z.coerce.number().optional().default(0),
  inventory: z.coerce.number().int().optional(),
});

// Link (or unlink) a tracker product to a Shopify variant.
export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  const d = parsed.data;

  if (d.variantId) {
    const clash = await prisma.product.findFirst({
      where: { shopifyVariantId: d.variantId, id: { not: d.productId } },
      select: { name: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: `That Shopify variant is already linked to "${clash.name}". Unlink it there first.` },
        { status: 409 }
      );
    }
  }

  await prisma.product.update({
    where: { id: d.productId },
    data: d.variantId
      ? {
          shopifyVariantId: d.variantId,
          shopifySku: d.sku || null,
          shopifyPrice: d.price || null,
          ...(d.inventory !== undefined ? { shopifyOnHand: d.inventory } : {}),
          shopifySyncedAt: new Date(),
        }
      : { shopifyVariantId: null, shopifySku: null, shopifyPrice: null, shopifyOnHand: null, shopifySyncedAt: null },
  });
  return NextResponse.json({ ok: true });
}
