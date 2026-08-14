import { z } from "zod";

// Shared purchase-order request schema (create + edit) and status helper.
// Kept in lib (not a route file) because Next.js route modules may only export
// route handlers and config.
export const orderBodySchema = z.object({
  supplierName: z.string().trim().min(1, "Supplier is required").max(120),
  supplierEmail: z.string().trim().email().optional().or(z.literal("")),
  supplierContact: z.string().trim().max(200).optional().or(z.literal("")),
  orderDate: z.string().optional().nullable(),
  expectedDate: z.string().optional().nullable(),
  currency: z.string().trim().max(8).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        productName: z.string().trim().min(1).max(200),
        productImage: z.string().trim().max(3_000_000).optional().or(z.literal("")),
        sku: z.string().trim().max(80).optional().or(z.literal("")),
        quantity: z.coerce.number().int().positive(),
        unitCost: z.coerce.number().min(0),
        receivedQty: z.coerce.number().int().min(0).optional(),
      })
    )
    .min(1, "Add at least one product"),
  costs: z
    .array(
      z.object({
        kind: z.enum(["SHIPPING", "OTHER"]),
        label: z.string().trim().min(1).max(120),
        amount: z.coerce.number(),
      })
    )
    .optional()
    .default([]),
});

// THE RULE: units on the way are ON THE WAY — they are never counted as
// received, and an item with units in transit is never "complete". When the
// recorded received total and the in-transit units would together exceed the
// ordered quantity (double-counted units, phantom boxes, stale manual entries),
// the in-transit units win: received is capped at ordered − in-transit.
export function effectiveReceived(
  quantity: number,
  receivedQty: number,
  inTransit: number
): number {
  return Math.max(0, Math.min(receivedQty, quantity, quantity - inTransit));
}

// Derive a status from received vs ordered quantities. CANCELLED is sticky and
// only changed via the explicit status action. Items may carry `inTransit`
// (units in undelivered boxes): while anything is in transit the order can
// never auto-complete to RECEIVED.
export function statusFromReceived(
  items: { quantity: number; receivedQty: number; inTransit?: number }[],
  current: string
): "DRAFT" | "OPEN" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED" {
  // DRAFT and CANCELLED are sticky — only changed via an explicit action.
  if (current === "DRAFT") return "DRAFT";
  if (current === "CANCELLED") return "CANCELLED";
  const ordered = items.reduce((s, it) => s + it.quantity, 0);
  const received = items.reduce(
    (s, it) => s + effectiveReceived(it.quantity, it.receivedQty, it.inTransit ?? 0),
    0
  );
  if (ordered > 0 && received >= ordered) return "RECEIVED";
  if (received > 0) return "PARTIALLY_RECEIVED";
  return "OPEN";
}
