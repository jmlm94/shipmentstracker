import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { orderBodySchema, statusFromReceived } from "@/lib/po";
import { PO_STATUS_META } from "@/lib/poStatus";
import { logPoEvent } from "@/lib/poLog";

// Full edit: replaces items + costs and recomputes status from received qty.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = orderBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 422 }
    );
  }
  const d = parsed.data;

  const existing = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = d.items.map((it) => ({
    productId: it.productId,
    productName: it.productName,
    productImage: it.productImage || null,
    sku: it.sku || null,
    quantity: it.quantity,
    unitCost: it.unitCost,
    receivedQty: it.receivedQty ?? 0,
  }));
  const status = statusFromReceived(
    items.map((it) => ({ quantity: it.quantity, receivedQty: it.receivedQty })),
    existing.status
  );

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: params.id } });
    await tx.purchaseOrderCost.deleteMany({ where: { purchaseOrderId: params.id } });
    await tx.purchaseOrder.update({
      where: { id: params.id },
      data: {
        supplierName: d.supplierName,
        supplierEmail: d.supplierEmail || null,
        supplierContact: d.supplierContact || null,
        orderDate: d.orderDate ? new Date(d.orderDate) : existing.orderDate,
        expectedDate: d.expectedDate ? new Date(d.expectedDate) : null,
        currency: d.currency || "USD",
        notes: d.notes || null,
        status,
        items: { create: items },
        costs: {
          create: d.costs.map((c, i) => ({ kind: c.kind, label: c.label, amount: c.amount, sort: i })),
        },
      },
    });
  });

  const units = items.reduce((s, it) => s + it.quantity, 0);
  const value = items.reduce((s, it) => s + it.quantity * it.unitCost, 0) +
    d.costs.reduce((s, c) => s + c.amount, 0);
  await logPoEvent(
    params.id,
    "EDIT",
    `Order edited — ${items.length} item${items.length === 1 ? "" : "s"}, ${units} units, total ${d.currency || "USD"} ${value.toFixed(2)}`,
    "dashboard"
  );

  return NextResponse.json({ ok: true, id: params.id });
}

const patchSchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  // "Mark received" sets every line's receivedQty to the ordered quantity so the
  // received column reflects the status; "unmark" (→ OPEN) resets received to 0.
  if (parsed.data.status === "RECEIVED") {
    const items = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: params.id } });
    await prisma.$transaction(
      items.map((it) =>
        prisma.purchaseOrderItem.update({ where: { id: it.id }, data: { receivedQty: it.quantity } })
      )
    );
  } else if (parsed.data.status === "OPEN") {
    await prisma.purchaseOrderItem.updateMany({
      where: { purchaseOrderId: params.id },
      data: { receivedQty: 0 },
    });
  }

  const before = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    select: { status: true },
  });
  await prisma.purchaseOrder.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });
  if (before && before.status !== parsed.data.status) {
    await logPoEvent(
      params.id,
      "STATUS",
      `Status: ${PO_STATUS_META[before.status].label} → ${PO_STATUS_META[parsed.data.status].label}` +
        (parsed.data.status === "RECEIVED"
          ? " — all items marked fully received"
          : parsed.data.status === "OPEN"
            ? " — received counts reset to 0"
            : ""),
      "dashboard"
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Unlink any shipments first (keep the shipments, drop the PO link).
  await prisma.shipment.updateMany({
    where: { purchaseOrderId: params.id },
    data: { purchaseOrderId: null },
  });
  await prisma.purchaseOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
