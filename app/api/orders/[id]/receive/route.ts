import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { statusFromReceived } from "@/lib/po";
import { poInTransitByProduct, planBoxCreditReduction } from "@/lib/receiving";
import { PO_STATUS_META } from "@/lib/poStatus";
import { logPoEvent } from "@/lib/poLog";

const schema = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), receivedQty: z.coerce.number().int().min(0) }))
    .min(1),
});

// Manually mark items delivered against a purchase order (the Receive view).
// Sets each item's receivedQty and recomputes status (→ partially received /
// received).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const byId = new Map(parsed.data.items.map((i) => [i.id, i.receivedQty]));
  const inTransit = await poInTransitByProduct(po.id);
  const next = po.items.map((it) => ({
    id: it.id,
    quantity: it.quantity,
    receivedQty: byId.has(it.id) ? Math.min(it.quantity, Math.max(0, byId.get(it.id)!)) : it.receivedQty,
    inTransit: inTransit.get(it.productId) || 0,
  }));

  // A draft becomes active the moment you start receiving against it.
  const base = po.status === "DRAFT" ? "OPEN" : po.status;

  // Corrections below what delivered boxes credit: take the surplus back from
  // the most recently delivered boxes so the next sync can't re-add it. The
  // item's box-derived share then equals the boxes' remaining credit.
  const credited = await prisma.box.findMany({
    where: { shipment: { purchaseOrderId: po.id }, unitsReceived: { not: null } },
    orderBy: [{ deliveredAt: { sort: "desc", nulls: "last" } }, { boxNumber: "desc" }],
    select: { id: true, productId: true, unitsReceived: true, status: true, boxCode: true },
  });
  const boxOps: ReturnType<typeof prisma.box.update>[] = [];
  const eventOps: ReturnType<typeof prisma.statusEvent.create>[] = [];
  const fromBoxes = new Map<string, number>();
  const creditLog: string[] = [];
  for (let i = 0; i < po.items.length; i++) {
    const it = po.items[i];
    if (!byId.has(it.id)) continue;
    const mine = credited
      .filter((b) => b.productId === it.productId)
      .map((b) => ({ ...b, unitsReceived: b.unitsReceived ?? 0 }));
    const boxSum = mine.reduce((s, b) => s + b.unitsReceived, 0);
    const target = next[i].receivedQty;
    // Over-delivery (boxes > ordered) with the count left at the ordered
    // quantity is not a correction — the roll-up already caps it.
    if (target >= Math.min(boxSum, it.quantity)) {
      fromBoxes.set(it.id, boxSum);
      continue;
    }
    const plan = planBoxCreditReduction(mine, boxSum - target);
    for (const p of plan) {
      const b = mine.find((x) => x.id === p.id)!;
      boxOps.push(
        prisma.box.update({
          where: { id: p.id },
          data: { unitsReceived: p.unitsReceived, hasDiscrepancy: true },
        })
      );
      eventOps.push(
        prisma.statusEvent.create({
          data: {
            boxId: p.id,
            fromStatus: b.status,
            toStatus: b.status,
            source: "warehouse",
            message: `Received count corrected on the PO: ${b.unitsReceived} → ${p.unitsReceived} units credited`,
            notified: true,
          },
        })
      );
    }
    const removed = plan.reduce((s, p) => s + p.removed, 0);
    fromBoxes.set(it.id, boxSum - removed);
    creditLog.push(
      `${removed} × ${it.productName} un-credited from ${plan.length} delivered box${plan.length === 1 ? "" : "es"} (correction)`
    );
  }

  const nextStatus = statusFromReceived(next, base);
  await prisma.$transaction([
    ...boxOps,
    ...eventOps,
    ...next.map((n) =>
      prisma.purchaseOrderItem.update({
        where: { id: n.id },
        data: {
          receivedQty: n.receivedQty,
          ...(fromBoxes.has(n.id) ? { receivedFromBoxes: fromBoxes.get(n.id)! } : {}),
        },
      })
    ),
    prisma.purchaseOrder.update({
      where: { id: params.id },
      data: { status: nextStatus },
    }),
  ]);

  // Activity log: one line per item whose count moved + the status change.
  for (let i = 0; i < next.length; i++) {
    const before = po.items[i].receivedQty;
    const after = next[i].receivedQty;
    if (after === before) continue;
    const delta = after - before;
    await logPoEvent(
      params.id,
      "RECEIVED",
      `${delta > 0 ? "+" : ""}${delta} × ${po.items[i].productName} received — now ${after} of ${po.items[i].quantity} (${Math.max(0, po.items[i].quantity - after)} remaining)`,
      "receive view"
    );
  }
  for (const line of creditLog) {
    await logPoEvent(params.id, "EDIT", line, "receive view");
  }
  if (nextStatus !== po.status) {
    await logPoEvent(
      params.id,
      "STATUS",
      `Status: ${PO_STATUS_META[po.status].label} → ${PO_STATUS_META[nextStatus].label}`,
      "receive view"
    );
  }

  return NextResponse.json({ ok: true });
}
