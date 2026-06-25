import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Look up a box for receiving. Prefer the per-box code (printed on the sticker
// QR); fall back to a tracking number (returns the first matching box).
export async function GET(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const code = (params.get("code") || params.get("tracking") || "").trim();
  if (!code) return NextResponse.json({ error: "Scan or enter a box code" }, { status: 400 });

  const box = await prisma.box.findFirst({
    where: { OR: [{ boxCode: code }, { trackingNumber: code }] },
    include: { shipment: { select: { supplierName: true, code: true, poNumber: true } } },
  });

  if (!box) {
    return NextResponse.json(
      { error: "No box found for that code or tracking number" },
      { status: 404 }
    );
  }

  return NextResponse.json({ box });
}
