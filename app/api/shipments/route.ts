import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shipmentSchema } from "@/lib/validation";
import { sendSlack } from "@/lib/slack";
import { generateShipmentCode, boxCodeFor } from "@/lib/code";
import { CARRIER_LABEL } from "@/lib/status";
import { logPoEvent } from "@/lib/poLog";

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

  // Resolve the purchase order — by id (chosen in the picker) or by the code
  // typed manually — and refuse shipments against orders that are already
  // fully fulfilled or cancelled, so nobody ships "on top of" a closed order.
  let po = data.purchaseOrderId
    ? await prisma.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId } })
    : null;
  if (!po && data.poNumber?.trim()) {
    po = await prisma.purchaseOrder.findFirst({
      where: { code: { equals: data.poNumber.trim(), mode: "insensitive" } },
    });
  }
  if (po) {
    const blocked: Partial<Record<typeof po.status, string>> = {
      RECEIVED: `Order ${po.code} has already been fully fulfilled — no more shipments can be added to it. Please contact the Carbinox Team for support.`,
      CANCELLED: `Order ${po.code} was cancelled — no shipments can be added to it. Please contact the Carbinox Team for support.`,
      DRAFT: `Order ${po.code} isn't finalized yet — please contact the Carbinox Team before shipping against it.`,
    };
    const msg = blocked[po.status];
    if (msg) return NextResponse.json({ fieldErrors: { poNumber: msg } }, { status: 409 });
    // A code typed by hand that matches a real open order gets properly
    // linked, so its boxes roll up to the PO like picker-selected ones.
    data.purchaseOrderId = po.id;
    data.poNumber = po.code;
  }

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

  if (data.purchaseOrderId) {
    await logPoEvent(
      data.purchaseOrderId,
      "SHIPMENT",
      `Shipment ${code} linked — ${totalBoxes} boxes, ${totalUnits} units from ${data.supplierName}`,
      "supplier form"
    );
  }

  return NextResponse.json({ id: shipment.id, code, boxes: totalBoxes });
}
