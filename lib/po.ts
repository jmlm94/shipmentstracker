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
        productImage: z.string().trim().max(500).optional().or(z.literal("")),
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

// Derive a status from received vs ordered quantities. CANCELLED is sticky and
// only changed via the explicit status action.
export function statusFromReceived(
  items: { quantity: number; receivedQty: number }[],
  current: string
): "OPEN" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED" {
  if (current === "CANCELLED") return "CANCELLED";
  const ordered = items.reduce((s, it) => s + it.quantity, 0);
  const received = items.reduce((s, it) => s + Math.min(it.receivedQty, it.quantity), 0);
  if (ordered > 0 && received >= ordered) return "RECEIVED";
  if (received > 0) return "PARTIALLY_RECEIVED";
  return "OPEN";
}
