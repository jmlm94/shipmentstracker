import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicImage } from "@/lib/images";
import { getProductImageResolver } from "@/lib/productImages";

export const dynamic = "force-dynamic";

// Public — the supplier form's "find your order" picker uses this. Returns only
// active (not received / cancelled) purchase orders with a short item summary.
export async function GET() {
  const img = await getProductImageResolver();
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["OPEN", "PARTIALLY_RECEIVED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        select: { productId: true, productName: true, productImage: true, sku: true, quantity: true },
      },
    },
  });

  // Public, supplier-facing — expose enough to confirm the order (products,
  // quantities, dates) but NOT internal pricing/costs.
  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      code: o.code,
      supplierName: o.supplierName,
      orderDate: o.orderDate.toISOString().slice(0, 10),
      expectedDate: o.expectedDate ? o.expectedDate.toISOString().slice(0, 10) : null,
      totalUnits: o.items.reduce((s, it) => s + it.quantity, 0),
      items: o.items.map((it) => ({
        productId: it.productId,
        name: it.productName,
        image: publicImage(img(it.productId, it.productImage, it.productName)),
        sku: it.sku || "",
        qty: it.quantity,
      })),
    })),
  });
}
