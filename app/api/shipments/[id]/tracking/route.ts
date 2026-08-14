import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { logPoEvent } from "@/lib/poLog";

export const dynamic = "force-dynamic";

const schema = z.object({
  numbers: z.array(z.string().trim().min(4).max(100)).min(1).max(2000),
});

// Replace the tracking numbers on a shipment's not-yet-delivered boxes.
// The pasted list is assigned in box order; delivered boxes keep their
// numbers. The count must match exactly so nothing is assigned blind.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tracking number list" }, { status: 422 });
  }
  const numbers = parsed.data.numbers;
  if (new Set(numbers).size !== numbers.length) {
    return NextResponse.json(
      { error: "The pasted list contains duplicate tracking numbers." },
      { status: 422 }
    );
  }

  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
    include: { boxes: { orderBy: { boxNumber: "asc" } }, lines: true },
  });
  if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  const assignable = shipment.boxes.filter(
    (b) => b.status !== "DELIVERED" && b.status !== "ADDED_IN_STOCK"
  );
  if (numbers.length !== assignable.length) {
    return NextResponse.json(
      {
        error: `${shipment.code} has ${assignable.length} box${assignable.length === 1 ? "" : "es"} awaiting delivery, but you pasted ${numbers.length} tracking number${numbers.length === 1 ? "" : "s"} — the counts must match so each box gets the right number.`,
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < assignable.length; i++) {
      await tx.box.update({
        where: { id: assignable[i].id },
        data: { trackingNumber: numbers[i], lastCarrierStatus: null, lastCheckedAt: null },
      });
    }
    // Keep each line's tracking metadata consistent with its boxes.
    for (const line of shipment.lines) {
      const lineBoxIds = new Set(
        shipment.boxes.filter((b) => b.lineId === line.id).map((b) => b.id)
      );
      const tracking = new Set<string>();
      for (const b of shipment.boxes) {
        if (!lineBoxIds.has(b.id)) continue;
        const idx = assignable.findIndex((a) => a.id === b.id);
        tracking.add(idx >= 0 ? numbers[idx] : b.trackingNumber);
      }
      if (tracking.size > 1) {
        await tx.shipmentLine.update({
          where: { id: line.id },
          data: { trackingPerBox: true, trackingNumber: null },
        });
      } else if (tracking.size === 1) {
        const only = [...tracking][0];
        await tx.shipmentLine.update({
          where: { id: line.id },
          data: { trackingPerBox: false, trackingNumber: only || null },
        });
      }
    }
  });

  if (shipment.purchaseOrderId) {
    await logPoEvent(
      shipment.purchaseOrderId,
      "SHIPMENT",
      `Shipment ${shipment.code} tracking numbers replaced — ${assignable.length} box${assignable.length === 1 ? "" : "es"} updated`,
      "dashboard"
    );
  }

  return NextResponse.json({ ok: true, updated: assignable.length });
}
