import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { syncPoReceivedFromShipments } from "@/lib/receiving";

// Pull received quantities from this PO's linked shipments (absolute), capped at
// the ordered quantity, and recompute status.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await syncPoReceivedFromShipments(params.id, "set");
  return NextResponse.json({ ok: true });
}
