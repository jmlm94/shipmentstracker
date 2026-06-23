import { BoxStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { sendSlack, formatStatusChange } from "./slack";
import { STATUS_META } from "./status";

type BoxWithShipment = Prisma.BoxGetPayload<{ include: { shipment: true } }>;

// Applies a status change to a box, records a StatusEvent, and fires a Slack
// notification. Returns true if the status actually changed.
export async function applyStatusChange(opts: {
  box: BoxWithShipment;
  toStatus: BoxStatus;
  source: "carrier" | "warehouse";
  detail?: string | null;
  extra?: Prisma.BoxUpdateInput;
}): Promise<boolean> {
  const { box, toStatus, source, detail, extra } = opts;
  const changed = box.status !== toStatus;

  await prisma.box.update({
    where: { id: box.id },
    data: {
      ...(changed ? { status: toStatus } : {}),
      ...extra,
      ...(toStatus === "DELIVERED" && !box.deliveredAt ? { deliveredAt: new Date() } : {}),
    },
  });

  if (!changed) return false;

  await prisma.statusEvent.create({
    data: {
      boxId: box.id,
      fromStatus: box.status,
      toStatus,
      source,
      message: detail || null,
      notified: true,
    },
  });

  await sendSlack(
    formatStatusChange({
      productName: box.productName,
      productId: box.productId,
      trackingNumber: box.trackingNumber,
      carrier: box.shipment.carrier,
      supplierName: box.shipment.supplierName,
      fromStatus: box.status ? STATUS_META[box.status].label : null,
      toStatus: STATUS_META[toStatus].label,
      detail,
    })
  );

  return true;
}
