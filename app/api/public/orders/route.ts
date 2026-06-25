import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public — the supplier form's "find your order" picker uses this. Returns only
// active (not received / cancelled) purchase orders with a short item summary.
export async function GET() {
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["OPEN", "PARTIALLY_RECEIVED"] } },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { productName: true, quantity: true } } },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      code: o.code,
      supplierName: o.supplierName,
      items: o.items.map((it) => ({ name: it.productName, qty: it.quantity })),
    })),
  });
}
