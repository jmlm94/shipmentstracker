import { BoxStatus, Carrier, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { ALL_STATUSES, CARRIER_LABEL, STATUS_META } from "@/lib/status";
import { PO_STATUS_META, poFinancials, itemLandedUnitCost } from "@/lib/poStatus";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvResponse(headers: string[], rows: unknown[][], filename: string): Response {
  const csv = [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

const round2 = (n: number | null) => (n === null ? "" : n.toFixed(2));

// Accounting exports: one row per purchase order (financial summary) or one
// row per PO line item (with its allocated landed unit cost).
async function exportOrders(lineLevel: boolean): Promise<Response> {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "asc" },
    include: { items: true, costs: true, payments: true },
  });
  const date = new Date().toISOString().slice(0, 10);

  if (!lineLevel) {
    const headers = [
      "PO",
      "Supplier",
      "Status",
      "Order date",
      "Currency",
      "Units ordered",
      "Units received",
      "Items subtotal",
      "Shipping & other costs",
      "Total",
      "Paid",
      "Balance due",
      "Landed cost per unit",
    ];
    const rows = orders.map((o) => {
      const fin = poFinancials(o.items, o.costs, o.payments);
      return [
        o.code,
        o.supplierName,
        PO_STATUS_META[o.status].label,
        o.orderDate.toISOString().slice(0, 10),
        o.currency,
        fin.orderedUnits,
        o.items.reduce((s, it) => s + Math.min(it.receivedQty, it.quantity), 0),
        round2(fin.subtotal),
        round2(fin.costsTotal),
        round2(fin.total),
        round2(fin.paid),
        round2(fin.balance),
        round2(fin.landedUnitCost),
      ];
    });
    return csvResponse(headers, rows, `purchase-orders-${date}.csv`);
  }

  const headers = [
    "PO",
    "Supplier",
    "Status",
    "Order date",
    "Currency",
    "Product",
    "SKU",
    "Qty ordered",
    "Qty received",
    "Unit cost",
    "Line subtotal",
    "Landed cost per unit",
    "Landed line total",
  ];
  const rows = orders.flatMap((o) => {
    const fin = poFinancials(o.items, o.costs, o.payments);
    return o.items.map((it) => {
      const landed = itemLandedUnitCost(it, fin);
      return [
        o.code,
        o.supplierName,
        PO_STATUS_META[o.status].label,
        o.orderDate.toISOString().slice(0, 10),
        o.currency,
        it.productName,
        it.sku || "",
        it.quantity,
        Math.min(it.receivedQty, it.quantity),
        round2(it.unitCost),
        round2(it.quantity * it.unitCost),
        round2(landed),
        landed === null ? "" : round2(landed * it.quantity),
      ];
    });
  });
  return csvResponse(headers, rows, `purchase-order-items-${date}.csv`);
}

// One CSV row per box — a flat "master sheet". Supports filters via query
// params: from, to (shipment date range), supplier, status, carrier.
// type=orders / type=order-items switch to the accounting exports.
export async function GET(req: Request) {
  if (!isAuthed()) return new Response("Unauthorized", { status: 401 });

  const params = new URL(req.url).searchParams;
  const type = params.get("type");
  if (type === "orders") return exportOrders(false);
  if (type === "order-items") return exportOrders(true);

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
