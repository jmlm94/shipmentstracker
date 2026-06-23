import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Look up a single box by its tracking number (used by the receiving page).
export async function GET(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tracking = new URL(req.url).searchParams.get("tracking")?.trim();
  if (!tracking) return NextResponse.json({ error: "Missing tracking number" }, { status: 400 });

  const box = await prisma.box.findUnique({
    where: { trackingNumber: tracking },
    include: { shipment: { select: { supplierName: true, carrier: true } } },
  });

  if (!box) return NextResponse.json({ error: "No box found with that tracking number" }, { status: 404 });

  return NextResponse.json({ box });
}
