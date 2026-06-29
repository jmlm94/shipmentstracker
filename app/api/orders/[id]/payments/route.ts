import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Ask Claude to read the paid amount (and date if visible) off a payment
// screenshot. Returns nulls on any failure so upload still succeeds.
async function readPayment(
  base64: string,
  mediaType: string
): Promise<{ amount: number | null; date: string | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { amount: null, date: null };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 512,
        tools: [
          {
            name: "report_payment",
            description: "Report the payment amount and date read from the receipt/transfer screenshot.",
            input_schema: {
              type: "object",
              properties: {
                amount: { type: "number", description: "The total amount paid, as a number (no currency symbol)." },
                date: { type: "string", description: "The payment date as YYYY-MM-DD, if shown." },
              },
            },
          },
        ],
        tool_choice: { type: "tool", name: "report_payment" },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              {
                type: "text",
                text: "This is a screenshot of a payment (bank transfer, wire, or receipt). Read the total amount paid and the payment date and call report_payment. If something isn't visible, omit it.",
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { amount: null, date: null };
    const data = await res.json();
    const tool = (data.content || []).find((b: any) => b.type === "tool_use");
    const amount = typeof tool?.input?.amount === "number" ? tool.input.amount : null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(tool?.input?.date || "") ? tool.input.date : null;
    return { amount, date };
  } catch {
    return { amount: null, date: null };
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
  if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }
  const file = form.get("image");
  const label = (form.get("label") as string | null)?.trim() || null;
  const amountRaw = (form.get("amount") as string | null)?.trim();
  const dateRaw = (form.get("paidAt") as string | null)?.trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No screenshot provided." }, { status: 400 });
  }
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    return NextResponse.json({ error: "Please upload a JPG or PNG screenshot." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");

  let url: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image is too large (max 10 MB)." }, { status: 413 });
    }
    const blob = await put(`po-payments/${po.id}/${file.name}`, file, { access: "public", addRandomSuffix: true });
    url = blob.url;
  } else {
    if (file.size > 1.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Screenshot is too large for direct storage (max 1.5 MB). Add Vercel Blob storage for larger files." },
        { status: 413 }
      );
    }
    url = `data:${file.type};base64,${base64}`;
  }

  // Manual values win; otherwise let the AI read the amount/date.
  let amount = amountRaw ? Number(amountRaw) : null;
  let paidAt = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? new Date(dateRaw) : null;
  if (amount == null || paidAt == null) {
    const read = await readPayment(base64, file.type);
    if (amount == null) amount = read.amount;
    if (paidAt == null && read.date) paidAt = new Date(read.date);
  }

  const payment = await prisma.poPayment.create({
    data: {
      purchaseOrderId: po.id,
      url,
      label,
      amount: amount != null && !Number.isNaN(amount) ? amount : null,
      paidAt: paidAt || new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    payment: {
      id: payment.id,
      url: payment.url,
      label: payment.label,
      amount: payment.amount,
      paidAt: payment.paidAt.toISOString().slice(0, 10),
    },
  });
}

// Inline edit a payment's amount / label / date.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const paymentId = body?.paymentId as string | undefined;
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

  const data: { label?: string | null; amount?: number | null; paidAt?: Date } = {};
  if (body.label !== undefined) data.label = String(body.label).trim() || null;
  if (body.amount !== undefined) {
    const n = body.amount === "" || body.amount === null ? null : Number(body.amount);
    data.amount = n != null && !Number.isNaN(n) ? n : null;
  }
  if (body.paidAt !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(body.paidAt || "")) {
    data.paidAt = new Date(body.paidAt);
  }

  await prisma.poPayment.updateMany({ where: { id: paymentId, purchaseOrderId: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const paymentId = new URL(req.url).searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
  await prisma.poPayment.deleteMany({ where: { id: paymentId, purchaseOrderId: params.id } });
  return NextResponse.json({ ok: true });
}
