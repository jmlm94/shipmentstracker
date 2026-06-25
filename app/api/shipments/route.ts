import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shipmentSchema } from "@/lib/validation";
import { sendSlack } from "@/lib/slack";
import { generateShipmentCode, boxCodeFor } from "@/lib/code";
import { CARRIER_LABEL } from "@/lib/status";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = shipmentSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ fieldErrors }, { status: 422 });
  }

  const data = parsed.data;

  // Generate a unique batch code, retrying on the rare collision.
  let code = generateShipmentCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.shipment.findUnique({ where: { code } });
    if (!clash) break;
    code = generateShipmentCode();
  }

  const totalBoxes = data.lines.reduce((s, l) => s + l.boxCount, 0);
  const totalUnits = data.lines.reduce((s, l) => s + l.boxCount * l.unitsPerBox, 0);

  // Create shipment → lines → expand each line into one Box per physical box,
  // each with a unique internal code (printed on its sticker QR).
  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        code,
        poNumber: data.poNumber,
        purchaseOrderId: data.purchaseOrderId || null,
        supplierName: data.supplierName,
        supplierEmail: data.supplierEmail || null,
        shipmentDate: new Date(data.shipmentDate),
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : null,
        boxesTotal: totalBoxes,
        notes: data.notes || null,
        manuallyAdded: data.manuallyAdded ?? false,
      },
    });

    let boxNumber = 0;
    for (const l of data.lines) {
      const perBox = l.trackingMode === "PER_BOX";
      const line = await tx.shipmentLine.create({
        data: {
          shipmentId: created.id,
          productId: l.productId,
          productName: l.productName,
          productSku: l.productSku || null,
          productImage: l.productImage || null,
          boxCount: l.boxCount,
          unitsPerBox: l.unitsPerBox,
          weightPerBox: l.weightPerBox,
          shippingMethod: l.shippingMethod,
          carrier: l.carrier,
          trackingPerBox: perBox,
          trackingNumber: perBox ? null : l.trackingNumber || null,
        },
      });

      const boxes: Prisma.BoxCreateManyInput[] = Array.from(
        { length: l.boxCount },
        (_, k) => {
          boxNumber += 1;
          return {
            shipmentId: created.id,
            lineId: line.id,
            boxCode: boxCodeFor(code, boxNumber),
            boxNumber,
            productId: l.productId,
            productName: l.productName,
            productImage: l.productImage || null,
            trackingNumber: perBox
              ? (l.boxTracking?.[k] || "").trim()
              : (l.trackingNumber || "").trim(),
            unitsPerBox: l.unitsPerBox,
            weightOfBox: l.weightPerBox,
            shippingMethod: l.shippingMethod,
            carrier: l.carrier,
            status: "PENDING" as const,
          };
        }
      );
      await tx.box.createMany({ data: boxes });
    }

    return created;
  });

  await sendSlack(
    `:inbox_tray: *New shipment ${code} from ${data.supplierName}*\n` +
      `${totalBoxes} boxes · ${totalUnits} units · ${data.lines.length} SKU line(s)\n` +
      data.lines
        .map(
          (l) =>
            `• ${l.productName}: ${l.boxCount}×${l.unitsPerBox} via ${CARRIER_LABEL[l.carrier]}`
        )
        .join("\n")
  );

  return NextResponse.json({ id: shipment.id, code, boxes: totalBoxes });
}
