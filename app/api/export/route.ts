import { BoxStatus, Carrier, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { ALL_STATUSES, CARRIER_LABEL, STATUS_META } from "@/lib/status";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// One CSV row per box — a flat "master sheet". Supports filters via query
// params: from, to (shipment date range), supplier, status, carrier.
export async function GET(req: Request) {
  if (!isAuthed()) return new Response("Unauthorized", { status: 401 });

  const params = new URL(req.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const supplier = params.get("supplier")?.trim();
  const status = params.get("status");
  const carrier = params.get("carrier");

  const where: Prisma.BoxWhereInput = {};
  if (status && ALL_STATUSES.includes(status as BoxStatus)) where.status = status as BoxStatus;
  if (carrier && ["UPS", "FEDEX", "USPS", "DHL", "OTHER"].includes(carrier))
    where.carrier = carrier as Carrier;
  const shipmentWhere: Prisma.ShipmentWhereInput = {};
  if (supplier) shipmentWhere.supplierName = supplier;
  if (from || to) {
    shipmentWhere.shipmentDate = {};
    if (from) shipmentWhere.shipmentDate.gte = new Date(from);
    if (to) shipmentWhere.shipmentDate.lte = new Date(`${to}T23:59:59`);
  }
  if (Object.keys(shipmentWhere).length) where.shipment = shipmentWhere;

  const boxes = await prisma.box.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { boxNumber: "asc" }],
    include: { shipment: true },
  });

  const headers = [
    "Shipment code",
    "PO Number",
    "Box code",
    "Supplier",
    "Shipment date",
    "Expected delivery",
    "Carrier",
    "Method",
    "Box #",
    "Product ID (SKU)",
    "Product name",
    "Tracking number",
    "Units per box",
    "Weight (lbs)",
    "Weight (kg)",
    "Status",
    "Discrepancy",
    "Weight received",
    "Units received",
    "Condition",
    "Received by",
    "Delivered at",
    "Carrier status",
    "Last checked",
  ];

  const rows = boxes.map((b) =>
    [
      b.shipment.code,
      b.shipment.poNumber,
      b.boxCode,
      b.shipment.supplierName,
      b.shipment.shipmentDate.toISOString().slice(0, 10),
      b.shipment.expectedDeliveryDate
        ? b.shipment.expectedDeliveryDate.toISOString().slice(0, 10)
        : "",
      CARRIER_LABEL[b.carrier],
      b.shippingMethod === "AIR" ? "Air" : "Sea",
      b.boxNumber,
      b.productId,
      b.productName,
      b.trackingNumber,
      b.unitsPerBox,
      b.weightOfBox,
      (b.weightOfBox / 2.20462).toFixed(2),
      STATUS_META[b.status].label,
      b.hasDiscrepancy ? "Yes" : "",
      b.weightReceived,
      b.unitsReceived,
      b.condition === "GOOD" ? "Good" : b.condition === "LOST_UNITS" ? "Lost units" : "",
      b.receivedBy,
      b.deliveredAt ? b.deliveredAt.toISOString().slice(0, 16).replace("T", " ") : "",
      b.lastCarrierStatus,
      b.lastCheckedAt ? b.lastCheckedAt.toISOString().slice(0, 16).replace("T", " ") : "",
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shipments-export-${date}.csv"`,
    },
  });
}
