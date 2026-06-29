import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { STATUS_META } from "@/lib/status";
import { etaFor, daysUntil, daysSince, TERMINAL_STATUSES } from "@/lib/eta";
import { unifyCosts, money } from "@/lib/poStatus";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-4-8";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Tools the assistant can call to read live data from the database.
const TOOLS = [
  {
    name: "get_overview",
    description:
      "Global snapshot: shipment/box/unit totals, box counts by status, overdue shipment count, and purchase-order counts by status. Call this first for big-picture questions.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_shipments",
    description:
      "List shipments, newest first. Optionally filter by box status, supplier name, or only-overdue. Returns a summary per shipment.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["PENDING", "IN_TRANSIT", "DELAYED", "DELIVERED", "DAMAGED", "ADDED_IN_STOCK", "LOST"],
        },
        supplier: { type: "string" },
        overdueOnly: { type: "boolean" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_shipment",
    description: "Full detail for one shipment by its code (e.g. SHP-7K3Q9P), including every box.",
    input_schema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  },
  {
    name: "list_orders",
    description: "List purchase orders, newest first. Optionally filter by status.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["OPEN", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"] },
      },
    },
  },
  {
    name: "get_order",
    description: "Full detail for one purchase order by its code (e.g. PO-0001): items, costs, totals, linked shipments.",
    input_schema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  },
] as const;

function statusLabel(s: string) {
  return (STATUS_META as any)[s]?.label || s;
}

async function overdueShipmentIds(now: Date) {
  const inTransit = await prisma.shipment.findMany({
    where: { boxes: { some: { status: { notIn: TERMINAL_STATUSES } } } },
    include: { lines: { select: { shippingMethod: true } } },
  });
  const ids = new Set<string>();
  for (const s of inTransit) {
    const eta = s.lines.length
      ? new Date(
          Math.min(
            ...s.lines.map((l) =>
              etaFor(s.shipmentDate, l.shippingMethod, s.expectedDeliveryDate).getTime()
            )
          )
        )
      : etaFor(s.shipmentDate, "AIR", s.expectedDeliveryDate);
    if (daysUntil(eta, now) <= 0) ids.add(s.id);
  }
  return ids;
}

async function runTool(name: string, input: any): Promise<unknown> {
  const now = new Date();
  if (name === "get_overview") {
    const [grouped, shipmentCount, unitsAgg, poGroups] = await Promise.all([
      prisma.box.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.shipment.count(),
      prisma.box.aggregate({ _sum: { unitsPerBox: true } }),
      prisma.purchaseOrder.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const overdue = await overdueShipmentIds(now);
    return {
      shipments: shipmentCount,
      boxes: grouped.reduce((s, g) => s + g._count._all, 0),
      units: unitsAgg._sum.unitsPerBox || 0,
      boxesByStatus: Object.fromEntries(grouped.map((g) => [statusLabel(g.status), g._count._all])),
      overdueShipments: overdue.size,
      purchaseOrdersByStatus: Object.fromEntries(poGroups.map((g) => [g.status, g._count._all])),
    };
  }

  if (name === "list_shipments") {
    const where: any = {};
    if (input.supplier) where.supplierName = { contains: String(input.supplier), mode: "insensitive" };
    if (input.status) where.boxes = { some: { status: input.status } };
    let shipments = await prisma.shipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(input.limit) || 25, 50),
      include: { boxes: { select: { status: true, carrier: true, unitsPerBox: true } } },
    });
    let overdue: Set<string> | null = null;
    if (input.overdueOnly) {
      overdue = await overdueShipmentIds(now);
      shipments = shipments.filter((s) => overdue!.has(s.id));
    }
    return shipments.map((s) => {
      const statusCounts: Record<string, number> = {};
      for (const b of s.boxes) statusCounts[statusLabel(b.status)] = (statusCounts[statusLabel(b.status)] || 0) + 1;
      return {
        code: s.code,
        supplier: s.supplierName,
        po: s.poNumber,
        shipmentDate: s.shipmentDate.toISOString().slice(0, 10),
        daysSinceShipped: daysSince(s.shipmentDate, now),
        boxes: s.boxes.length,
        units: s.boxes.reduce((a, b) => a + b.unitsPerBox, 0),
        carriers: Array.from(new Set(s.boxes.map((b) => b.carrier))),
        statusCounts,
      };
    });
  }

  if (name === "get_shipment") {
    const s = await prisma.shipment.findUnique({
      where: { code: String(input.code) },
      include: { boxes: { orderBy: { boxNumber: "asc" } } },
    });
    if (!s) return { error: `No shipment with code ${input.code}` };
    return {
      code: s.code,
      supplier: s.supplierName,
      email: s.supplierEmail,
      po: s.poNumber,
      shipmentDate: s.shipmentDate.toISOString().slice(0, 10),
      expectedDeliveryDate: s.expectedDeliveryDate?.toISOString().slice(0, 10) || null,
      notes: s.notes,
      boxes: s.boxes.map((b) => ({
        boxCode: b.boxCode,
        product: b.productName,
        status: statusLabel(b.status),
        carrier: b.carrier,
        tracking: b.trackingNumber,
        units: b.unitsPerBox,
        lastCarrierStatus: b.lastCarrierStatus,
        receivedBy: b.receivedBy,
      })),
    };
  }

  if (name === "list_orders") {
    const where: any = {};
    if (input.status) where.status = input.status;
    const orders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true, costs: true, _count: { select: { shipments: true } } },
    });
    return orders.map((o) => {
      const subtotal = o.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
      const total = subtotal + unifyCosts(o).reduce((s, c) => s + c.amount, 0);
      return {
        code: o.code,
        supplier: o.supplierName,
        status: o.status,
        units: o.items.reduce((s, it) => s + it.quantity, 0),
        received: o.items.reduce((s, it) => s + Math.min(it.receivedQty, it.quantity), 0),
        total: money(total, o.currency),
        shipments: o._count.shipments,
      };
    });
  }

  if (name === "get_order") {
    const o = await prisma.purchaseOrder.findUnique({
      where: { code: String(input.code) },
      include: { items: true, costs: true, shipments: { select: { code: true, supplierName: true } } },
    });
    if (!o) return { error: `No purchase order with code ${input.code}` };
    const subtotal = o.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
    const costs = unifyCosts(o);
    return {
      code: o.code,
      supplier: o.supplierName,
      status: o.status,
      orderDate: o.orderDate.toISOString().slice(0, 10),
      items: o.items.map((it) => ({
        product: it.productName,
        ordered: it.quantity,
        received: Math.min(it.receivedQty, it.quantity),
        unitCost: money(it.unitCost, o.currency),
      })),
      costs: costs.map((c) => ({ label: c.label, amount: money(c.amount, o.currency) })),
      total: money(subtotal + costs.reduce((s, c) => s + c.amount, 0), o.currency),
      linkedShipments: o.shipments.map((s) => `${s.code} (${s.supplierName})`),
    };
  }

  return { error: `Unknown tool ${name}` };
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The assistant isn't configured yet. Add an ANTHROPIC_API_KEY environment variable in Vercel." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const history = Array.isArray(body?.messages) ? body.messages : null;
  if (!history) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // Map client history (role + string content) into Anthropic message format.
  const messages: any[] = history
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m: any) => ({ role: m.role, content: m.content }))
    .slice(-20);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Send a question." }, { status: 400 });
  }

  const system =
    "You are the assistant for Carbinox's Shipments Tracker — an app that manages supplier " +
    "shipments, purchase orders, warehouse receiving, and delivery tracking for a smartwatch/" +
    "accessories brand. Answer the team's questions about their shipments, purchase orders, " +
    "products, suppliers, and statuses using the tools to read live data. Be concise and specific, " +
    "cite real codes (SHP-…, PO-…), and surface anything that needs attention (overdue, stuck, " +
    `damaged, discrepancies). Today's date is ${new Date().toISOString().slice(0, 10)}. ` +
    "If the data doesn't contain the answer, say so plainly.";

  try {
    for (let i = 0; i < 8; i++) {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: MODEL, max_tokens: 2048, system, tools: TOOLS, messages }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("assistant anthropic error", res.status, t);
        return NextResponse.json({ error: `Assistant error (${res.status}).` }, { status: 502 });
      }
      const data = await res.json();
      messages.push({ role: "assistant", content: data.content });

      if (data.stop_reason === "tool_use") {
        const toolResults = [];
        for (const block of data.content) {
          if (block.type === "tool_use") {
            let result: unknown;
            try {
              result = await runTool(block.name, block.input || {});
            } catch (e) {
              console.error("tool failed", block.name, e);
              result = { error: "Tool failed." };
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // Final answer — collect text blocks.
      const text = (data.content || [])
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim();
      return NextResponse.json({ reply: text || "(no answer)" });
    }
    return NextResponse.json({ reply: "I couldn't finish that — try narrowing the question." });
  } catch (e) {
    console.error("assistant failed", e);
    return NextResponse.json({ error: "Couldn't reach the assistant." }, { status: 502 });
  }
}
