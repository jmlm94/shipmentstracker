import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATALOG } from "@/lib/catalog";
import { publicImage } from "@/lib/images";

export const dynamic = "force-dynamic";

// Public — the supplier form's product picker uses this. Returns the imported
// catalog (e.g. from Sortly) when present; otherwise the bundled Shopify
// snapshot so the form always has products.
export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  if (products.length > 0) {
    return NextResponse.json({
      source: "imported",
      products: products.map((p) => ({
        id: p.id,
        title: p.name,
        sku: p.sku || "",
        image: publicImage(p.image),
      })),
    });
  }

  return NextResponse.json({ source: "shopify-snapshot", products: CATALOG });
}
