import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shipmentSchema } from "@/lib/validation";
import { sendSlack } from "@/lib/slack";
import { generateShipmentCode } from "@/lib/code";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = shipmentSchema.safeParse(body);
  if (!parsed.success) {
    // Flatten Zod issues into a "path.to.field" -> message map for the UI.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ fieldErrors }, { status: 422 });
  }

  const data = parsed.data;

  // Reject tracking numbers that already exist in the system.
  const trackingNumbers = data.boxes.map((b) => b.trackingNumber);
  const existing = await prisma.box.findMany({
    where: { trackingNumber: { in: trackingNumbers } },
    select: { trackingNumber: true },
  });
  if (existing.length > 0) {
    const fieldErrors: Record<string, string> = {};
    const dup = new Set(existing.map((e) => e.trackingNumber));
    data.boxes.forEach((b, i) => {
      if (dup.has(b.trackingNumber)) {
        fieldErrors[`boxes.${i}.trackingNumber`] =
          "This tracking number is already in the system";
      }
    });
    return NextResponse.json({ fieldErrors }, { status: 422 });
  }

  // Generate a unique batch code, retrying on the rare collision.
  let code = generateShipmentCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.shipment.findUnique({ where: { code } });
    if (!clash) break;
    code = generateShipmentCode();
  }

  const shipment = await prisma.shipment.create({
    data: {
      code,
      supplierName: data.supplierName,
      supplierEmail: data.supplierEmail || null,
      shipmentDate: new Date(data.shipmentDate),
      carrier: data.carrier,
      shippingMethod: data.shippingMethod,
      boxesTotal: data.boxes.length,
      notes: data.notes || null,
      boxes: {
        create: data.boxes.map((b, i) => ({
          boxNumber: i + 1,
          productId: b.productId,
          productName: b.productName || null,
          trackingNumber: b.trackingNumber,
          unitsPerBox: b.unitsPerBox,
          weightOfBox: b.weightOfBox,
          status: "PENDING",
          events: {
            create: {
              toStatus: "PENDING",
              source: "supplier",
              message: "Box submitted by supplier",
              notified: true,
            },
          },
        })),
      },
    },
  });

  const totalUnits = data.boxes.reduce((s, b) => s + b.unitsPerBox, 0);
  await sendSlack(
    `:inbox_tray: *New shipment ${code} from ${data.supplierName}*\n` +
      `${data.boxes.length} boxes · ${totalUnits} units · ${data.carrier} (${data.shippingMethod})`
  );

  return NextResponse.json({ id: shipment.id, code, boxes: data.boxes.length });
}
