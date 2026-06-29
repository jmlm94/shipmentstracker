import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { statusFromReceived } from "@/lib/po";

// Pull received quantities from this PO's linked shipments: for each item, set
// receivedQty to the units actually received at the warehouse (box.unitsReceived)
// for that product, capped at the ordered quantity. Recomputes status.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      shipments: { include: { boxes: { select: { productId: true, unitsReceived: true } } } },
    },
  });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const receivedByProduct = new Map<string, number>();
  for (const s of po.shipments) {
    for (const b of s.boxes) {
      if (b.unitsReceived != null) {
        receivedByProduct.set(b.productId, (receivedByProduct.get(b.productId) || 0) + b.unitsReceived);
      }
    }
  }

  const next = po.items.map((it) => ({
    id: it.id,
    quantity: it.quantity,
    receivedQty: Math.min(it.quantity, receivedByProduct.get(it.productId) || 0),
  }));

  await prisma.$transaction([
    ...next.map((it) =>
      prisma.purchaseOrderItem.update({ where: { id: it.id }, data: { receivedQty: it.receivedQty } })
    ),
    prisma.purchaseOrder.update({
      where: { id: params.id },
      data: { status: statusFromReceived(next, po.status) },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
