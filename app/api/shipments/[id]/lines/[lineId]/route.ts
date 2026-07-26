import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { boxCodeFor } from "@/lib/code";
import { logPoEvent } from "@/lib/poLog";
import { syncPoReceivedFromShipments } from "@/lib/receiving";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  boxCount: z.coerce.number().int().min(1).max(2000).optional(),
  unitsPerBox: z.coerce.number().int().min(1).max(100000).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
});

// Correct a shipment line after the fact — e.g. a supplier who typed the unit
// count into the "boxes" field (492 boxes → really 20). Reconciles the Box
// rows to match: boxes that were already delivered/received/photographed are
// kept in preference to untouched ones; surplus untouched boxes are deleted;
// extra boxes are created if the count grows.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; lineId: string } }
) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid values" }, { status: 422 });
  }
  const data = parsed.data;

  const line = await prisma.shipmentLine.findFirst({
    where: { id: params.lineId, shipmentId: params.id },
    include: {
      shipment: true,
      boxes: {
        orderBy: { boxNumber: "asc" },
        include: { _count: { select: { photos: true } } },
      },
    },
  });
  if (!line) return NextResponse.json({ error: "Line not found" }, { status: 404 });

  const newCount = data.boxCount ?? line.boxes.length;
  const touched = (b: (typeof line.boxes)[number]) =>
    b.status === "DELIVERED" ||
    b.status === "ADDED_IN_STOCK" ||
    b.unitsReceived != null ||
    b.hasDiscrepancy ||
    b._count.photos > 0;

  const touchedCount = line.boxes.filter(touched).length;
  if (newCount < touchedCount) {
    return NextResponse.json(
      {
        error: `${touchedCount} boxes on this line are already delivered or have receiving data — the box count can't go below that.`,
      },
      { status: 409 }
    );
  }

  // Keep touched boxes first, then lowest box numbers.
  const ordered = [...line.boxes].sort((a, b) => {
    const t = Number(touched(b)) - Number(touched(a));
    return t !== 0 ? t : a.boxNumber - b.boxNumber;
  });
  const keep = ordered.slice(0, newCount);
  const drop = ordered.slice(newCount);

  const boxUpdates: { unitsPerBox?: number; trackingNumber?: string } = {};
  if (data.unitsPerBox !== undefined) boxUpdates.unitsPerBox = data.unitsPerBox;
  if (data.trackingNumber !== undefined && !line.trackingPerBox) {
    boxUpdates.trackingNumber = data.trackingNumber;
  }

  await prisma.$transaction(async (tx) => {
    if (drop.length > 0) {
      await tx.box.deleteMany({ where: { id: { in: drop.map((b) => b.id) } } });
    }
    if (Object.keys(boxUpdates).length > 0) {
      await tx.box.updateMany({ where: { id: { in: keep.map((b) => b.id) } }, data: boxUpdates });
    }
    if (newCount > line.boxes.length) {
      const maxBoxNumber = await tx.box.aggregate({
        where: { shipmentId: line.shipmentId },
        _max: { boxNumber: true },
      });
      let n = maxBoxNumber._max.boxNumber ?? 0;
      await tx.box.createMany({
        data: Array.from({ length: newCount - line.boxes.length }, () => {
          n += 1;
          return {
            shipmentId: line.shipmentId,
            lineId: line.id,
            boxCode: boxCodeFor(line.shipment.code, n),
            boxNumber: n,
            productId: line.productId,
            productName: line.productName,
            productImage: line.productImage,
            trackingNumber: line.trackingPerBox
              ? ""
              : (data.trackingNumber ?? line.trackingNumber ?? ""),
            unitsPerBox: data.unitsPerBox ?? line.unitsPerBox,
            weightOfBox: line.weightPerBox,
            shippingMethod: line.shippingMethod,
            carrier: line.carrier,
            status: "PENDING" as const,
          };
        }),
      });
    }

    await tx.shipmentLine.update({
      where: { id: line.id },
      data: {
        boxCount: newCount,
        ...(data.unitsPerBox !== undefined ? { unitsPerBox: data.unitsPerBox } : {}),
        ...(data.trackingNumber !== undefined && !line.trackingPerBox
          ? { trackingNumber: data.trackingNumber || null }
          : {}),
      },
    });

    const total = await tx.box.count({ where: { shipmentId: line.shipmentId } });
    await tx.shipment.update({ where: { id: line.shipmentId }, data: { boxesTotal: total } });
  });

  if (line.shipment.purchaseOrderId) {
    const parts: string[] = [];
    if (newCount !== line.boxes.length) parts.push(`${line.boxes.length} → ${newCount} boxes`);
    if (data.unitsPerBox !== undefined && data.unitsPerBox !== line.unitsPerBox)
      parts.push(`${line.unitsPerBox} → ${data.unitsPerBox} units/box`);
    if (boxUpdates.trackingNumber !== undefined && boxUpdates.trackingNumber !== (line.trackingNumber ?? ""))
      parts.push(`tracking updated`);
    if (parts.length > 0) {
      await logPoEvent(
        line.shipment.purchaseOrderId,
        "SHIPMENT",
        `Shipment ${line.shipment.code} corrected — ${line.productName}: ${parts.join(", ")}`,
        "dashboard"
      );
      await syncPoReceivedFromShipments(line.shipment.purchaseOrderId, "add", "shipment edit");
    }
  }

  return NextResponse.json({ ok: true, boxes: newCount, deleted: drop.length });
}
