import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public (no auth) — the supplier form uses this to let suppliers pick a
// product from the catalog instead of typing a SKU. Only safe, minimal fields
// are exposed.
export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { sku: true, name: true, unitsPerBox: true },
  });
  return NextResponse.json({ products });
}
