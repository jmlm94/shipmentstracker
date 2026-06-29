import { prisma } from "./prisma";
import { getTrackingProvider } from "./tracking";
import { carrierStatusToBoxStatus } from "./status";
import { applyCarrierStatusChange } from "./updateStatus";
import { sendSlack } from "./slack";
import { etaFor, daysSince, TERMINAL_STATUSES } from "./eta";

// Runs the carrier-tracking refresh and the overdue check, recording a SyncRun.
// Shared by the daily cron and the manual "Refresh now" button.
export async function runTrackingRefresh(trigger: "cron" | "manual") {
  const run = await prisma.syncRun.create({ data: { trigger } });
  let checked = 0;
  let changed = 0;
  let ok = true;

  try {
    const provider = await getTrackingProvider();
    if (provider.name !== "none") {
      const boxes = await prisma.box.findMany({
        where: { status: { in: ["PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELAYED"] } },
        include: { shipment: true },
      });
      for (const box of boxes) {
        const result = await provider.track(box.trackingNumber, box.carrier);
        checked++;
        if (!result) continue;
        await prisma.box.update({
          where: { id: box.id },
          data: { lastCarrierStatus: result.detail || result.rawStatus, lastCheckedAt: new Date() },
        });
        const mapped = carrierStatusToBoxStatus(result.rawStatus);
        if (mapped && mapped !== box.status) {
          const didChange = await applyCarrierStatusChange({
            box,
            toStatus: mapped,
            detail: result.detail || null,
          });
          if (didChange) changed++;
        }
      }
    }

    await checkOverdue();
  } catch (e) {
    ok = false;
    console.error("[refreshTracking] failed", e);
  }

  await prisma.syncRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), boxesChecked: checked, statusChanges: changed, ok },
  });

  return { checked, changed, ok };
}

// Find boxes past their ETA that haven't been alerted yet, group by shipment,
// fire one Slack alert per shipment, and mark them alerted (no duplicates).
async function checkOverdue() {
  const now = new Date();
  const boxes = await prisma.box.findMany({
    where: { status: { notIn: TERMINAL_STATUSES }, overdueNotifiedAt: null },
    include: { shipment: true },
  });

  const byShipment = new Map<
    string,
    { code: string; supplier: string; po: string | null; boxIds: string[]; days: number }
  >();

  for (const box of boxes) {
    const deadline = etaFor(box.shipment.shipmentDate, box.shippingMethod, box.shipment.expectedDeliveryDate);
    if (now <= deadline) continue;
    const days = daysSince(box.shipment.shipmentDate, now);
    const e =
      byShipment.get(box.shipmentId) || {
        code: box.shipment.code,
        supplier: box.shipment.supplierName,
        po: box.shipment.poNumber,
        boxIds: [],
        days,
      };
    e.boxIds.push(box.id);
    e.days = Math.max(e.days, days);
    byShipment.set(box.shipmentId, e);
  }

  for (const v of byShipment.values()) {
    await sendSlack(
      `:warning: *Shipment ${v.code} from ${v.supplier} is overdue*\n` +
        `${v.boxIds.length} box(es) still in transit after ${v.days} days.` +
        (v.po ? ` PO ${v.po}.` : "")
    );
    await prisma.box.updateMany({ where: { id: { in: v.boxIds } }, data: { overdueNotifiedAt: now } });
  }
}
