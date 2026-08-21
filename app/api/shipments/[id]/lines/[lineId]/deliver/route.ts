import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { sendSlack } from "@/lib/slack";
import { syncPoReceivedFromShipments } from "@/lib/receiving";
import { logPoEvent } from "@/lib/poLog";

export const dynamic = "force-dynamic";

const schema = z.object({ units: z.coerce.number().int().min(1) });

// Record a partial delivery on ONE shipment line by unit count: "2,850 black
// metal bands arrived". Boxes are marked DELIVERED in box order until the
// count is covered. A box that gets only part of its units is flagged as a
// discrepancy so the shortfall is visible for follow-up.
export async function POST(
  req: Request,
  { params }: { params: { id: string; lineId: string } }
) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid unit count" }, { status: 422 });
  const units = parsed.data.units;

  const line = await prisma.shipmentLine.findFirst({
    where: { id: params.lineId, shipmentId: params.id },
    include: { shipment: true, boxes: { orderBy: { boxNumber: "asc" } } },
  });
  if (!line) return NextResponse.json({ error: "Line not found" }, { status: 404 });

  const pending = line.boxes.filter(
    (b) => !["DELIVERED", "ADDED_IN_STOCK", "LOST", "DAMAGED"].includes(b.status)
  );
  const capacity = pending.reduce((s, b) => s + b.unitsPerBox, 0);
  if (pending.length === 0) {
    return NextResponse.json(
      { error: "Every box on this line is already delivered or written off." },
      { status: 409 }
    );
  }
  if (units > capacity) {
    return NextResponse.json(
      {
        error: `Only ${capacity} units are still on the way for ${line.productName} on this shipment — can't receive ${units}. If more arrived than expected, receive ${capacity} here and record the extras in the order's Receive view.`,
      },
      { status: 409 }
    );
  }

  const now = new Date();
  let remaining = units;
  let boxesDelivered = 0;
  let partial = 0;
  await prisma.$transaction(async (tx) => {
    for (const b of pending) {
      if (remaining <= 0) break;
      const credit = Math.min(b.unitsPerBox, remaining);
      remaining -= credit;
      boxesDelivered++;
      const short = credit < b.unitsPerBox;
      if (short) partial++;
      await tx.box.update({
        where: { id: b.id },
        data: {
          status: "DELIVERED",
          deliveredAt: now,
          unitsReceived: credit,
          ...(short ? { hasDiscrepancy: true } : {}),
        },
      });
      await tx.statusEvent.create({
        data: {
          boxId: b.id,
          fromStatus: b.status,
          toStatus: "DELIVERED",
          source: "warehouse",
          message: short
            ? `partial delivery recorded — ${credit} of ${b.unitsPerBox} units`
            : `marked delivered from dashboard (${credit} units)`,
          notified: true,
        },
      });
    }
  });

  if (line.shipment.purchaseOrderId) {
    await syncPoReceivedFromShipments(line.shipment.purchaseOrderId, "add", "line delivery");
    await logPoEvent(
      line.shipment.purchaseOrderId,
      "SHIPMENT",
      `${units} × ${line.productName} delivered on ${line.shipment.code} (${boxesDelivered} box${boxesDelivered === 1 ? "" : "es"}${partial > 0 ? `, ${partial} partial` : ""})`,
      "dashboard"
    );
  }

  await sendSlack(
    `:package: *${units} × ${line.productName} delivered* — ${line.shipment.code} (${line.shipment.supplierName})\n` +
      `${boxesDelivered} box${boxesDelivered === 1 ? "" : "es"} marked delivered${partial > 0 ? ` · ${partial} partial — check for shortfall` : ""}${line.shipment.poNumber ? ` · ${line.shipment.poNumber}` : ""}`
  );

  return NextResponse.json({ ok: true, units, boxes: boxesDelivered, partial });
}
