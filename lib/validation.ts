import { z } from "zod";

// Strict, per-box validation. Suppliers must be completely clear about every
// single box — every field below is required (except optional notes / product
// name / email) and trimmed/normalized.

export const boxSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, "Product ID (SKU) is required"),
  productName: z.string().trim().max(120).optional().or(z.literal("")),
  trackingNumber: z
    .string()
    .trim()
    .min(4, "Tracking number is required")
    .max(60, "Tracking number looks too long"),
  unitsPerBox: z
    .coerce.number({ invalid_type_error: "Units per box must be a number" })
    .int("Units per box must be a whole number")
    .positive("Units per box must be greater than 0"),
  weightOfBox: z
    .coerce.number({ invalid_type_error: "Box weight must be a number" })
    .positive("Box weight must be greater than 0"),
});

export const shipmentSchema = z
  .object({
    supplierName: z.string().trim().min(1, "Supplier name is required"),
    supplierEmail: z
      .string()
      .trim()
      .email("Enter a valid email")
      .optional()
      .or(z.literal("")),
    shipmentDate: z
      .string()
      .min(1, "Shipment date is required")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
    carrier: z.enum(["FEDEX", "DHL", "UPS"], {
      errorMap: () => ({ message: "Select a carrier" }),
    }),
    shippingMethod: z.enum(["AIR", "SEA"], {
      errorMap: () => ({ message: "Select a shipping method" }),
    }),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    boxes: z.array(boxSchema).min(1, "Add at least one box"),
  })
  .superRefine((data, ctx) => {
    // Tracking numbers must be unique within the submission.
    const seen = new Map<string, number>();
    data.boxes.forEach((b, i) => {
      const key = b.trackingNumber.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["boxes", i, "trackingNumber"],
          message: "Duplicate tracking number in this shipment",
        });
      }
      seen.set(key, i);
    });
  });

export type ShipmentInput = z.infer<typeof shipmentSchema>;
export type BoxInput = z.infer<typeof boxSchema>;
