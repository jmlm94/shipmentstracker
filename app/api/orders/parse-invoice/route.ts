import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { CATALOG, type CatalogProduct } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-4-8";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// JSON shape we ask Claude to fill from the invoice.
const EXTRACT_TOOL = {
  name: "extract_purchase_order",
  description:
    "Return the structured purchase-order data found in the supplier invoice/quote document.",
  input_schema: {
    type: "object",
    properties: {
      supplierName: { type: "string", description: "The supplier/vendor company name" },
      supplierEmail: { type: "string" },
      supplierContact: { type: "string", description: "Contact person, phone, or similar" },
      orderDate: { type: "string", description: "Invoice/order date as YYYY-MM-DD" },
      currency: { type: "string", description: "3-letter currency code, e.g. USD" },
      notes: { type: "string", description: "Payment terms, incoterms, or other relevant notes" },
      items: {
        type: "array",
        description: "One entry per product line on the invoice",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Product name/description as written" },
            sku: { type: "string" },
            quantity: { type: "number" },
            unitCost: { type: "number", description: "Cost per unit (not the line total)" },
          },
          required: ["name", "quantity", "unitCost"],
        },
      },
      shippingCosts: {
        type: "array",
        description: "Freight / shipping charges (one per line if itemized)",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            amount: { type: "number" },
          },
          required: ["label", "amount"],
        },
      },
      otherCosts: {
        type: "array",
        description: "Other charges or credits/discounts. Set isCredit true for discounts/credits.",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            amount: { type: "number", description: "Positive magnitude" },
            isCredit: { type: "boolean" },
          },
          required: ["label", "amount"],
        },
      },
    },
    required: ["items"],
  },
} as const;

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Best-effort match of an invoice line name to a catalog product.
function matchProduct(rawName: string, rawSku: string, catalog: CatalogProduct[]) {
  const n = normalize(rawName);
  const sku = normalize(rawSku || "");
  if (!n && !sku) return null;
  // SKU exact match first.
  if (sku) {
    const bySku = catalog.find((p) => p.sku && normalize(p.sku) === sku);
    if (bySku) return bySku;
  }
  // Exact normalized title.
  const exact = catalog.find((p) => normalize(p.title) === n);
  if (exact) return exact;
  // Containment either direction, prefer the longest title overlap.
  let best: CatalogProduct | null = null;
  let bestLen = 0;
  for (const p of catalog) {
    const t = normalize(p.title);
    if (!t) continue;
    if (t.includes(n) || n.includes(t)) {
      if (t.length > bestLen) {
        best = p;
        bestLen = t.length;
      }
    }
  }
  return best;
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Invoice import isn't configured yet. Add an ANTHROPIC_API_KEY environment variable in Vercel to enable it.",
      },
      { status: 503 }
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded file." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });

  const type = file.type || "";
  const isPdf = type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = /^image\/(png|jpe?g|webp|gif)$/.test(type);
  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Upload a PDF or an image (PNG/JPG) of the invoice." },
      { status: 400 }
    );
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "File is too large (max 25 MB)." }, { status: 413 });
  }
  const base64 = bytes.toString("base64");

  const docBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : {
        type: "image",
        source: { type: "base64", media_type: type || "image/png", data: base64 },
      };

  const body = {
    model: MODEL,
    max_tokens: 4096,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_purchase_order" },
    messages: [
      {
        role: "user",
        content: [
          docBlock,
          {
            type: "text",
            text:
              "This is a supplier invoice or quote for a purchase order. Extract the data and call " +
              "extract_purchase_order. Use per-UNIT cost (divide line totals by quantity if only a total " +
              "is shown). Dates as YYYY-MM-DD. Treat discounts/credits as otherCosts with isCredit=true. " +
              "If a field is absent, omit it.",
          },
        ],
      },
    ],
  };

  let aiJson: any;
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Anthropic error", res.status, errText);
      return NextResponse.json(
        { error: `Couldn't read the invoice (AI service returned ${res.status}).` },
        { status: 502 }
      );
    }
    aiJson = await res.json();
  } catch (e) {
    console.error("parse-invoice fetch failed", e);
    return NextResponse.json({ error: "Couldn't reach the AI service." }, { status: 502 });
  }

  const toolUse = (aiJson.content || []).find((b: any) => b.type === "tool_use");
  if (!toolUse?.input) {
    return NextResponse.json(
      { error: "Couldn't find purchase-order details in that document." },
      { status: 422 }
    );
  }
  const x = toolUse.input;

  // Catalog: DB products if present, else the bundled snapshot.
  const dbProducts = await prisma.product.findMany();
  const catalog: CatalogProduct[] = dbProducts.length
    ? dbProducts.map((p) => ({ id: p.id, title: p.name, sku: p.sku || "", image: p.image || "" }))
    : CATALOG;

  const items = (Array.isArray(x.items) ? x.items : []).map((it: any) => {
    const rawName = String(it.name || "").trim();
    const match = matchProduct(rawName, String(it.sku || ""), catalog);
    return {
      productId: match?.id || "",
      productName: match?.title || rawName,
      productImage: match?.image || "",
      sku: match?.sku || String(it.sku || ""),
      quantity: it.quantity != null ? String(it.quantity) : "",
      unitCost: it.unitCost != null ? String(it.unitCost) : "",
      receivedQty: "",
      hint: match ? undefined : rawName,
    };
  });

  const draft = {
    supplierName: String(x.supplierName || ""),
    supplierEmail: String(x.supplierEmail || ""),
    supplierContact: String(x.supplierContact || ""),
    orderDate: /^\d{4}-\d{2}-\d{2}$/.test(x.orderDate || "") ? x.orderDate : "",
    expectedDate: "",
    currency: String(x.currency || "USD").toUpperCase().slice(0, 8),
    notes: String(x.notes || ""),
    items: items.length ? items : [],
    shippingCosts: (Array.isArray(x.shippingCosts) ? x.shippingCosts : []).map((c: any) => ({
      label: String(c.label || "Shipping"),
      amount: c.amount != null ? String(Math.abs(c.amount)) : "",
    })),
    otherCosts: (Array.isArray(x.otherCosts) ? x.otherCosts : []).map((c: any) => ({
      label: String(c.label || ""),
      amount: c.amount != null ? String(Math.abs(c.amount)) : "",
      sign: c.isCredit ? "-" : "+",
    })),
  };

  return NextResponse.json({ draft });
}
