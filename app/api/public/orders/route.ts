import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicImage } from "@/lib/images";

export const dynamic = "force-dynamic";

// Public — the supplier form's "find your order" picker uses this. Returns only
// active (not received / cancelled) purchase orders with a short item summary.
export async function GET() {
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["OPEN", "PARTIALLY_RECEIVED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { productName: true, productImage: true, sku: true, quantity: true } },
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
        name: it.productName,
        image: publicImage(it.productImage),
        sku: it.sku || "",
        qty: it.quantity,
      })),
    })),
  });
}
