import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { STATUS_META } from "@/lib/status";

const CARRIER_LABEL: Record<string, string> = { FEDEX: "FedEx", DHL: "DHL", UPS: "UPS" };

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// One CSV row per box — a flat "master sheet" of everything in the system.
export async function GET() {
  if (!isAuthed()) return new Response("Unauthorized", { status: 401 });

  const boxes = await prisma.box.findMany({
    orderBy: [{ createdAt: "desc" }, { boxNumber: "asc" }],
    include: { shipment: true },
  });

  const headers = [
    "Supplier",
    "Shipment date",
    "Carrier",
    "Method",
    "Box #",
    "Product ID (SKU)",
    "Product name",
    "Tracking number",
    "Units per box",
    "Weight of box (lbs)",
    "Status",
    "Weight received",
    "Units received",
    "Condition",
    "Delivered at",
    "Carrier status",
    "Last checked",
  ];

  const rows = boxes.map((b) =>
    [
      b.shipment.supplierName,
      b.shipment.shipmentDate.toISOString().slice(0, 10),
      CARRIER_LABEL[b.shipment.carrier],
      b.shipment.shippingMethod === "AIR" ? "Air" : "Sea",
      b.boxNumber,
      b.productId,
      b.productName,
      b.trackingNumber,
      b.unitsPerBox,
      b.weightOfBox,
      STATUS_META[b.status].label,
      b.weightReceived,
      b.unitsReceived,
      b.condition === "GOOD" ? "Good" : b.condition === "LOST_UNITS" ? "Lost units" : "",
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
      "Content-Disposition": `attachment; filename="shipments-${date}.csv"`,
    },
  });
}
