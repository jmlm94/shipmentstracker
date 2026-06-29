import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { generateShipmentCode, boxCodeFor } from "@/lib/code";
import { sendSlack } from "@/lib/slack";
import { CARRIER_LABEL } from "@/lib/status";

// Internal-only: attach tracking number(s) to a purchase order without the full
// supplier form. Each line becomes one ShipmentLine + one Box so tracking,
// receiving, and PO roll-up all work. Units default to the remaining quantity.
const schema = z.object({
  purchaseOrderId: z.string().min(1),
  shipmentDate: z.string().min(1).refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  method: z.enum(["AIR", "SEA"]),
  lines: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        productName: z.string().trim().min(1).max(200),
        productImage: z.string().trim().max(3_000_000).optional().or(z.literal("")),
        sku: z.string().trim().max(80).optional().or(z.literal("")),
        units: z.coerce.number().int().positive(),
        carrier: z.enum(["UPS", "FEDEX", "USPS", "DHL", "OTHER"]),
        trackingNumber: z.string().trim().min(1, "Tracking number required").max(80),
      })
    )
    .min(1, "Add at least one tracking line"),
});

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 422 }
    );
  }
  const d = parsed.data;

  const po = await prisma.purchaseOrder.findUnique({ where: { id: d.purchaseOrderId } });
  if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });

  let code = generateShipmentCode();
  for (let i = 0; i < 5; i++) {
    if (!(await prisma.shipment.findUnique({ where: { code } }))) break;
    code = generateShipmentCode();
  }

  const totalBoxes = d.lines.length;
  const totalUnits = d.lines.reduce((s, l) => s + l.units, 0);

  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        code,
        poNumber: po.code,
        purchaseOrderId: po.id,
        supplierName: po.supplierName,
        supplierEmail: po.supplierEmail,
        shipmentDate: new Date(d.shipmentDate),
        boxesTotal: totalBoxes,
        manuallyAdded: true,
        notes: "Tracking added internally (quick-track).",
      },
    });

    let boxNumber = 0;
    for (const l of d.lines) {
      const line = await tx.shipmentLine.create({
        data: {
          shipmentId: created.id,
          productId: l.productId,
          productName: l.productName,
          productSku: l.sku || null,
          productImage: l.productImage || null,
          boxCount: 1,
          unitsPerBox: l.units,
          weightPerBox: 0,
          shippingMethod: d.method,
          carrier: l.carrier,
          trackingPerBox: false,
          trackingNumber: l.trackingNumber,
        },
      });
      boxNumber += 1;
      const box: Prisma.BoxCreateManyInput = {
        shipmentId: created.id,
        lineId: line.id,
        boxCode: boxCodeFor(code, boxNumber),
        boxNumber,
        productId: l.productId,
        productName: l.productName,
        productImage: l.productImage || null,
        trackingNumber: l.trackingNumber,
        unitsPerBox: l.units,
        weightOfBox: 0,
        shippingMethod: d.method,
        carrier: l.carrier,
        status: "PENDING" as const,
      };
      await tx.box.create({ data: box });
    }

    // A draft becomes active once it's shipping.
    if (po.status === "DRAFT") {
      await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "OPEN" } });
    }

    return created;
  });

  await sendSlack(
    `:label: *Tracking added for ${po.code} — ${po.supplierName}* (${code})\n` +
      d.lines
        .map((l) => `• ${l.productName}: ${l.units} units · ${CARRIER_LABEL[l.carrier]} \`${l.trackingNumber}\``)
        .join("\n")
  );

  return NextResponse.json({ id: shipment.id, code, boxes: totalBoxes, units: totalUnits });
}
