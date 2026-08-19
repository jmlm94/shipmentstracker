import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { sendSlack } from "@/lib/slack";
import { syncPoReceivedFromShipments } from "@/lib/receiving";
import { logPoEvent } from "@/lib/poLog";

export const dynamic = "force-dynamic";

// Mark every undelivered box on a shipment as DELIVERED in one action —
// the manual equivalent of the carrier confirming the whole shipment.
// Units are credited exactly like a carrier delivery (unitsReceived =
// unitsPerBox unless already set), the linked PO re-syncs once, and one
// Slack summary is sent instead of a message per box. LOST / DAMAGED
// boxes are left alone — they're written off, not delivered.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
    include: { boxes: { orderBy: { boxNumber: "asc" } } },
  });
  if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  const pending = shipment.boxes.filter(
    (b) => !["DELIVERED", "ADDED_IN_STOCK", "LOST", "DAMAGED"].includes(b.status)
  );
  if (pending.length === 0) {
    return NextResponse.json({ error: "Every box on this shipment is already delivered or written off." }, { status: 409 });
  }

  const now = new Date();
  let units = 0;
  await prisma.$transaction(async (tx) => {
    for (const b of pending) {
      units += b.unitsReceived ?? b.unitsPerBox;
      await tx.box.update({
        where: { id: b.id },
        data: {
          status: "DELIVERED",
          deliveredAt: b.deliveredAt ?? now,
          ...(b.unitsReceived == null ? { unitsReceived: b.unitsPerBox } : {}),
        },
      });
      await tx.statusEvent.create({
        data: {
          boxId: b.id,
          fromStatus: b.status,
          toStatus: "DELIVERED",
          source: "warehouse",
          message: "marked delivered from dashboard (whole shipment)",
          notified: true,
        },
      });
    }
  });

  if (shipment.purchaseOrderId) {
    await syncPoReceivedFromShipments(shipment.purchaseOrderId, "add", "mark delivered");
    await logPoEvent(
      shipment.purchaseOrderId,
      "SHIPMENT",
      `Shipment ${shipment.code} marked delivered — ${pending.length} box${pending.length === 1 ? "" : "es"}, ${units} units`,
      "dashboard"
    );
  }

  await sendSlack(
    `:white_check_mark: *Shipment ${shipment.code} marked delivered* (${shipment.supplierName})\n` +
      `${pending.length} box${pending.length === 1 ? "" : "es"} · ${units} units credited${shipment.poNumber ? ` · ${shipment.poNumber}` : ""}`
  );

  return NextResponse.json({ ok: true, boxes: pending.length, units });
}
