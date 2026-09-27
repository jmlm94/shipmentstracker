import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { shopifyConfigured, listStoreVariants } from "@/lib/shopify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Live store catalog for the import/link page, with existing link info.
export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!shopifyConfigured()) {
    return NextResponse.json({ error: "Shopify isn't configured." }, { status: 503 });
  }
  const [variants, products] = await Promise.all([
    listStoreVariants(),
    prisma.product.findMany({ select: { id: true, name: true, shopifyVariantId: true } }),
  ]);
  return NextResponse.json({
    variants,
    linkedVariantIds: products.filter((p) => p.shopifyVariantId).map((p) => p.shopifyVariantId),
  });
}
