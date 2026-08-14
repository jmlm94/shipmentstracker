import { prisma } from "./prisma";
import { statusFromReceived } from "./po";
import { PO_STATUS_META } from "./poStatus";
import { logPoEvent } from "./poLog";

export type ReceivedItemState = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  receivedQty: number;
  receivedFromBoxes: number;
};

// Pure roll-up math: a PO item's received total is its MANUAL baseline
// (receivedQty − receivedFromBoxes, i.e. units recorded by hand for untracked
// shipments) PLUS the units delivered in tracked boxes. Box deliveries add to
// manual receipts instead of competing with them — receiving 2,000 by box on
// top of 4,016 recorded by hand yields 6,016, not max(4016, 2000).
//
//  - mode "add":  keep the manual baseline, replace the box component with the
//                 fresh box-derived number (default; used everywhere boxes
//                 change).
//  - mode "set":  total = box-derived only (the explicit "Sync received"
//                 button: make the PO match the boxes, wiping manual entries).
export function nextReceivedTotals(
  items: ReceivedItemState[],
  boxDerived: Map<string, number>,
  mode: "add" | "set"
): { id: string; quantity: number; receivedQty: number; receivedFromBoxes: number }[] {
  return items.map((it) => {
    const derived = boxDerived.get(it.productId) || 0;
    const manualBaseline = Math.max(0, it.receivedQty - it.receivedFromBoxes);
    const total = mode === "set" ? derived : manualBaseline + derived;
    return {
      id: it.id,
      quantity: it.quantity,
      receivedQty: Math.max(0, Math.min(it.quantity, total)),
      receivedFromBoxes: derived,
    };
  });
}

// Units per product sitting in undelivered (and not written-off) boxes across
// a PO's linked shipments. Used to keep the order's status honest: while units
// are on the way, the order can never auto-complete.
export async function poInTransitByProduct(poId: string): Promise<Map<string, number>> {
  const boxes = await prisma.box.findMany({
    where: {
      shipment: { purchaseOrderId: poId },
      unitsReceived: null,
      status: { notIn: ["LOST", "DAMAGED"] },
    },
    select: { productId: true, unitsPerBox: true },
  });
  const m = new Map<string, number>();
  for (const b of boxes) m.set(b.productId, (m.get(b.productId) || 0) + b.unitsPerBox);
  return m;
}

// Roll up units received in tracked boxes (box.unitsReceived) into the linked
// purchase order's per-item receivedQty, then recompute the PO status. This is
// the connection between a delivered package and its purchase order.
// `source` describes what caused the sync, for the PO activity log.
export async function syncPoReceivedFromShipments(
  poId: string,
  mode: "add" | "set" = "add",
  source = "shipments"
): Promise<void> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      items: true,
      shipments: {
        include: {
          boxes: {
            select: { productId: true, unitsReceived: true, unitsPerBox: true, status: true },
          },
        },
      },
    },
  });
  if (!po) return;

  const boxDerived = new Map<string, number>();
  const inTransit = new Map<string, number>();
  for (const s of po.shipments) {
    for (const b of s.boxes) {
      if (b.unitsReceived != null) {
        boxDerived.set(b.productId, (boxDerived.get(b.productId) || 0) + b.unitsReceived);
      } else if (b.status !== "LOST" && b.status !== "DAMAGED") {
        // Undelivered, not written off → still on the way. While these exist
        // the order must not read as complete.
        inTransit.set(b.productId, (inTransit.get(b.productId) || 0) + b.unitsPerBox);
      }
    }
  }

  const next = nextReceivedTotals(po.items, boxDerived, mode);
  const nextWithTransit = next.map((n, i) => ({
    ...n,
    inTransit: inTransit.get(po.items[i].productId) || 0,
  }));

  // Skip the write if nothing changed (avoids needless churn on every box scan).
  const changed = next.some(
    (n, i) =>
      n.receivedQty !== po.items[i].receivedQty ||
      n.receivedFromBoxes !== po.items[i].receivedFromBoxes
  );
  const nextStatus = statusFromReceived(nextWithTransit, po.status);
  if (!changed && nextStatus === po.status) return;

  await prisma.$transaction([
    ...next
      .filter(
        (n, i) =>
          n.receivedQty !== po.items[i].receivedQty ||
          n.receivedFromBoxes !== po.items[i].receivedFromBoxes
      )
      .map((n) =>
        prisma.purchaseOrderItem.update({
          where: { id: n.id },
          data: { receivedQty: n.receivedQty, receivedFromBoxes: n.receivedFromBoxes },
        })
      ),
    prisma.purchaseOrder.update({ where: { id: poId }, data: { status: nextStatus } }),
  ]);

  // Activity log: one line per item whose received total moved, plus the
  // status transition when it changed.
  for (let i = 0; i < next.length; i++) {
    const before = po.items[i].receivedQty;
    const after = next[i].receivedQty;
    if (after === before) continue;
    const delta = after - before;
    await logPoEvent(
      poId,
      "RECEIVED",
      `${delta > 0 ? "+" : ""}${delta} × ${po.items[i].productName} received — now ${after} of ${po.items[i].quantity} (${Math.max(0, po.items[i].quantity - after)} remaining)`,
      source
    );
  }
  if (nextStatus !== po.status) {
    await logPoEvent(
      poId,
      "STATUS",
      `Status: ${PO_STATUS_META[po.status].label} → ${PO_STATUS_META[nextStatus].label}`,
      source
    );
  }
}

// Safety net, run on every tracking refresh: (1) any box that reached
// DELIVERED / ADDED_IN_STOCK without its units credited gets credited now,
// (2) every purchase order with credited boxes is re-synced. Guarantees
// "delivered ⇒ received" even when the real-time path missed it (data lag,
// old data, races).
export async function reconcileDeliveredBoxes(): Promise<number> {
  const uncredited = await prisma.box.findMany({
    where: { status: { in: ["DELIVERED", "ADDED_IN_STOCK"] }, unitsReceived: null },
    select: { id: true, unitsPerBox: true },
  });
  for (const b of uncredited) {
    await prisma.box.update({ where: { id: b.id }, data: { unitsReceived: b.unitsPerBox } });
  }

  const linked = await prisma.shipment.findMany({
    where: { purchaseOrderId: { not: null }, boxes: { some: { unitsReceived: { not: null } } } },
    select: { purchaseOrderId: true },
    distinct: ["purchaseOrderId"],
  });
  for (const s of linked) {
    if (s.purchaseOrderId) {
      await syncPoReceivedFromShipments(s.purchaseOrderId, "add", "reconcile");
    }
  }
  return uncredited.length;
}
