import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { logPoEvent } from "@/lib/poLog";

// Delete a shipment and everything under it (lines, boxes, events, photos all
// cascade via the schema relations).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shipment = await prisma.shipment.findUnique({ where: { id: params.id } });
  if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  await prisma.shipment.delete({ where: { id: params.id } });
  if (shipment.purchaseOrderId) {
    await logPoEvent(
      shipment.purchaseOrderId,
      "SHIPMENT",
      `Shipment ${shipment.code} deleted (its boxes no longer count toward this order)`,
      "dashboard"
    );
  }
  return NextResponse.json({ ok: true });
}
