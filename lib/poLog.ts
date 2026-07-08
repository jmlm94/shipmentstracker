import { prisma } from "./prisma";

export type PoEventKind = "RECEIVED" | "STATUS" | "SHIPMENT" | "PAYMENT" | "EDIT";

// Append an entry to a purchase order's activity log. Never throws — a
// logging hiccup must not break the operation being logged.
export async function logPoEvent(
  purchaseOrderId: string,
  kind: PoEventKind,
  message: string,
  source?: string
): Promise<void> {
  try {
    await prisma.poEvent.create({ data: { purchaseOrderId, kind, message, source } });
  } catch (e) {
    console.error("[poLog] failed", purchaseOrderId, kind, e);
  }
}
