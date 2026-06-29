import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Upload a payment-confirmation screenshot (JPG/PNG only) for a purchase order.
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
  const amount = amountRaw ? Number(amountRaw) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No screenshot provided." }, { status: 400 });
  }
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    return NextResponse.json({ error: "Please upload a JPG or PNG screenshot." }, { status: 400 });
  }

  let url: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image is too large (max 10 MB)." }, { status: 413 });
    }
    const blob = await put(`po-payments/${po.id}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    url = blob.url;
  } else {
    // No Blob configured — store a data URI (capped to keep rows light).
    if (file.size > 1.5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error:
            "Screenshot is too large for direct storage (max 1.5 MB). Use a smaller image, or add Vercel Blob storage for larger files.",
        },
        { status: 413 }
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    url = `data:${file.type};base64,${bytes.toString("base64")}`;
  }

  const payment = await prisma.poPayment.create({
    data: {
      purchaseOrderId: po.id,
      url,
      label,
      amount: amount != null && !Number.isNaN(amount) ? amount : null,
    },
  });

  return NextResponse.json({ ok: true, payment: { id: payment.id, url: payment.url } });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const paymentId = new URL(req.url).searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
  await prisma.poPayment.deleteMany({ where: { id: paymentId, purchaseOrderId: params.id } });
  return NextResponse.json({ ok: true });
}
