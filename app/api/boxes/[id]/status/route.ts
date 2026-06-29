import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { applyStatusChange } from "@/lib/updateStatus";
import { syncPoReceivedFromShipments } from "@/lib/receiving";

const schema = z.object({
  status: z.enum([
    "PENDING",
    "IN_TRANSIT",
    "DELAYED",
    "DELIVERED",
    "DAMAGED",
    "ADDED_IN_STOCK",
    "LOST",
  ]),
  weightReceived: z.coerce.number().positive().optional().nullable(),
  unitsReceived: z.coerce.number().int().nonnegative().optional().nullable(),
  condition: z.enum(["GOOD", "LOST_UNITS"]).optional().nullable(),
  receivedBy: z.string().trim().max(120).optional().nullable(),
  detail: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const box = await prisma.box.findUnique({
    where: { id: params.id },
    include: { shipment: true },
  });
  if (!box) return NextResponse.json({ error: "Box not found" }, { status: 404 });

  const { status, weightReceived, unitsReceived, condition, receivedBy, detail } = parsed.data;

  const extra: Prisma.BoxUpdateInput = {};
  if (weightReceived !== undefined) extra.weightReceived = weightReceived;
  if (unitsReceived !== undefined) extra.unitsReceived = unitsReceived;
  if (condition !== undefined) extra.condition = condition;
  if (receivedBy !== undefined) extra.receivedBy = receivedBy;

  // Flag a discrepancy when received units differ from declared, weight is off
  // by more than 5%, or staff marked lost units / damaged.
  const finalUnits = unitsReceived !== undefined ? unitsReceived : box.unitsReceived;
  const finalWeight = weightReceived !== undefined ? weightReceived : box.weightReceived;
  const unitMismatch = finalUnits != null && finalUnits !== box.unitsPerBox;
  const weightMismatch =
    finalWeight != null &&
    box.weightOfBox > 0 &&
    Math.abs(finalWeight - box.weightOfBox) / box.weightOfBox > 0.05;
  const conditionBad = (condition ?? box.condition) === "LOST_UNITS" || status === "DAMAGED";
  extra.hasDiscrepancy = Boolean(unitMismatch || weightMismatch || conditionBad);

  await applyStatusChange({
    box,
    toStatus: status,
    source: "warehouse",
    detail: detail || null,
    extra,
  });

  // Reflect this receipt on the linked purchase order (delivered package →
  // PO received count). "max" so it never lowers a manually-entered value.
  if (box.shipment.purchaseOrderId) {
    await syncPoReceivedFromShipments(box.shipment.purchaseOrderId, "max");
  }

  return NextResponse.json({ ok: true, hasDiscrepancy: extra.hasDiscrepancy });
}
