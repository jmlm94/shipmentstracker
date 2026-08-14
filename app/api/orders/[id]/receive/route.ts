import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { statusFromReceived } from "@/lib/po";
import { poInTransitByProduct } from "@/lib/receiving";
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

  const nextStatus = statusFromReceived(next, base);
  await prisma.$transaction([
    ...next.map((n) =>
      prisma.purchaseOrderItem.update({ where: { id: n.id }, data: { receivedQty: n.receivedQty } })
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
