import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTrackingProvider } from "@/lib/tracking";
import { carrierStatusToBoxStatus } from "@/lib/status";
import { applyStatusChange } from "@/lib/updateStatus";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Runs daily (Vercel Cron) to poll the carrier for every box that is still in
// flight, update its status, and fire Slack notifications on any change.
export async function GET(req: Request) {
  // Authorize: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const provider = await getTrackingProvider();
  if (provider.name === "none") {
    return NextResponse.json({ ok: true, provider: "none", message: "No tracking provider configured; skipping." });
  }

  // Only boxes that aren't in a terminal state need polling.
  const boxes = await prisma.box.findMany({
    where: { status: { in: ["PENDING", "IN_TRANSIT", "DELAYED"] } },
    include: { shipment: true },
  });

  let checked = 0;
  let changed = 0;

  for (const box of boxes) {
    const result = await provider.track(box.trackingNumber, box.shipment.carrier);
    checked++;
    if (!result) continue;

    await prisma.box.update({
      where: { id: box.id },
      data: { lastCarrierStatus: result.detail || result.rawStatus, lastCheckedAt: new Date() },
    });

    const mapped = carrierStatusToBoxStatus(result.rawStatus);
    if (mapped && mapped !== box.status) {
      const didChange = await applyStatusChange({
        box,
        toStatus: mapped,
        source: "carrier",
        detail: result.detail || null,
      });
      if (didChange) changed++;
    }
  }

  return NextResponse.json({ ok: true, provider: provider.name, checked, changed });
}
