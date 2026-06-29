import { prisma } from "./prisma";
import { statusFromReceived } from "./po";

// Roll up how many units of each product have actually been received at the
// warehouse (box.unitsReceived) into the linked purchase order's per-item
// receivedQty, then recompute the PO status. This is the connection between a
// delivered package and its purchase order.
//
//  - mode "set":  receivedQty = box-derived total (absolute; used by the manual
//                 "Sync received" button).
//  - mode "max":  receivedQty = max(current, box-derived) — never lowers a value
//                 recorded manually in the Receive view; used when a box is
//                 delivered so deliveries push the PO's received count up.
export async function syncPoReceivedFromShipments(
  poId: string,
  mode: "set" | "max" = "set"
): Promise<void> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      items: true,
      shipments: { include: { boxes: { select: { productId: true, unitsReceived: true } } } },
    },
  });
  if (!po) return;

  const receivedByProduct = new Map<string, number>();
  for (const s of po.shipments) {
    for (const b of s.boxes) {
      if (b.unitsReceived != null) {
        receivedByProduct.set(b.productId, (receivedByProduct.get(b.productId) || 0) + b.unitsReceived);
      }
    }
  }

  const next = po.items.map((it) => {
    const derived = Math.min(it.quantity, receivedByProduct.get(it.productId) || 0);
    const value = mode === "max" ? Math.max(it.receivedQty, derived) : derived;
    return { id: it.id, quantity: it.quantity, receivedQty: value };
  });

  // Skip the write if nothing changed (avoids needless churn on every box scan).
  const changed = next.some((n, i) => n.receivedQty !== po.items[i].receivedQty);
  const nextStatus = statusFromReceived(next, po.status);
  if (!changed && nextStatus === po.status) return;

  await prisma.$transaction([
    ...next
      .filter((n, i) => n.receivedQty !== po.items[i].receivedQty)
      .map((n) => prisma.purchaseOrderItem.update({ where: { id: n.id }, data: { receivedQty: n.receivedQty } })),
    prisma.purchaseOrder.update({ where: { id: poId }, data: { status: nextStatus } }),
  ]);
}
