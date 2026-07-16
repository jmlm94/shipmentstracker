import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { getTrackingProvider } from "@/lib/tracking";
import { carrierStatusToBoxStatus } from "@/lib/status";
import { applyCarrierStatusChange } from "@/lib/updateStatus";
import { syncPoReceivedFromShipments } from "@/lib/receiving";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// "Update tracking" on a purchase order: query EasyPost live for every active
// box on this order's shipments, apply any status changes (which credit
// deliveries to the order), then re-sync the roll-up. Scoped to one PO so it
// stays fast even with lots of other shipments in the system.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
  if (!po) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const provider = await getTrackingProvider();
  if (provider.name === "none") {
    return NextResponse.json(
      { error: "Live tracking isn't configured (no EASYPOST_API_KEY)." },
      { status: 503 }
    );
  }

  const boxes = await prisma.box.findMany({
    where: {
      shipment: { purchaseOrderId: po.id },
      status: { in: ["PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELAYED"] },
      trackingNumber: { not: "" },
    },
    include: { shipment: true },
  });

  let checked = 0;
  let changed = 0;
  for (const box of boxes) {
    const result = await provider.track(box.trackingNumber, box.carrier);
    checked++;
    if (!result) continue;
    await prisma.box.update({
      where: { id: box.id },
      data: { lastCarrierStatus: result.detail || result.rawStatus, lastCheckedAt: new Date() },
    });
    const mapped = carrierStatusToBoxStatus(result.rawStatus);
    if (mapped && mapped !== box.status) {
      const didChange = await applyCarrierStatusChange({
        box,
        toStatus: mapped,
        detail: result.detail || null,
      });
      if (didChange) changed++;
    }
  }

  // Heal any delivered-but-uncredited boxes on this order, then re-sync.
  const uncredited = await prisma.box.findMany({
    where: {
      shipment: { purchaseOrderId: po.id },
      status: { in: ["DELIVERED", "ADDED_IN_STOCK"] },
      unitsReceived: null,
    },
    select: { id: true, unitsPerBox: true },
  });
  for (const b of uncredited) {
    await prisma.box.update({ where: { id: b.id }, data: { unitsReceived: b.unitsPerBox } });
  }
  await syncPoReceivedFromShipments(po.id, "add", "manual refresh");

  return NextResponse.json({ ok: true, checked, changed, healed: uncredited.length });
}
