import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyCarrierStatusChange } from "@/lib/updateStatus";
import { carrierStatusToBoxStatus } from "@/lib/status";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// EasyPost webhook receiver — gives live tracking updates between the twice-daily
// polls. Configure this URL in EasyPost (Account → Webhooks):
//   https://<your-app>/api/tracking/easypost?secret=<EASYPOST_WEBHOOK_SECRET>
// If EASYPOST_WEBHOOK_SECRET is set, the secret query param must match.
export async function POST(req: Request) {
  const secret = process.env.EASYPOST_WEBHOOK_SECRET;
  if (secret) {
    const given = new URL(req.url).searchParams.get("secret");
    if (given !== secret) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const result = body?.result;
  const trackingCode: string | undefined = result?.tracking_code;
  const rawStatus: string | undefined = result?.status;
  if (!trackingCode || !rawStatus) {
    return NextResponse.json({ ok: true, skipped: "no tracker payload" });
  }

  const details = Array.isArray(result?.tracking_details) ? result.tracking_details : [];
  const detail: string | null = details[details.length - 1]?.message || result?.status_detail || null;

  // A tracking number may cover several boxes (batch shipments).
  const boxes = await prisma.box.findMany({
    where: { trackingNumber: trackingCode },
    include: { shipment: true },
  });
  if (boxes.length === 0) return NextResponse.json({ ok: true, skipped: "no matching box" });

  const mapped = carrierStatusToBoxStatus(rawStatus);
  let changed = 0;
  for (const box of boxes) {
    await prisma.box.update({
      where: { id: box.id },
      data: { lastCarrierStatus: detail || rawStatus, lastCheckedAt: new Date() },
    });
    if (mapped && mapped !== box.status) {
      const didChange = await applyCarrierStatusChange({ box, toStatus: mapped, detail });
      if (didChange) changed++;
    }
  }

  return NextResponse.json({ ok: true, boxes: boxes.length, changed });
}
