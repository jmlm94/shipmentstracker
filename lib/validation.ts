import { z } from "zod";

// Each SKU line: one product, how many boxes, units/box, weight/box, and a
// single shipping method + carrier + tracking number for the whole line.
// Every field is mandatory.
export const lineSchema = z.object({
  productId: z.string().trim().min(1, "Pick a product"),
  productName: z.string().trim().min(1, "Product name missing").max(200),
  productSku: z.string().trim().max(80).optional().or(z.literal("")),
  productImage: z.string().trim().max(500).optional().or(z.literal("")),
  boxCount: z
    .coerce.number({ invalid_type_error: "Number of boxes must be a number" })
    .int("Boxes must be a whole number")
    .positive("At least 1 box")
    .max(2000, "That's a lot of boxes — split the shipment"),
  unitsPerBox: z
    .coerce.number({ invalid_type_error: "Units per box must be a number" })
    .int("Units per box must be a whole number")
    .positive("Units per box must be greater than 0"),
  weightPerBox: z
    .coerce.number({ invalid_type_error: "Box weight must be a number" })
    .positive("Box weight must be greater than 0"),
  shippingMethod: z.enum(["AIR", "SEA"], {
    errorMap: () => ({ message: "Pick Air or Sea" }),
  }),
  carrier: z.enum(["UPS", "FEDEX", "USPS", "DHL", "OTHER"], {
    errorMap: () => ({ message: "Select a carrier" }),
  }),
  trackingNumber: z
    .string()
    .trim()
    .min(3, "Tracking number is required")
    .max(80, "Tracking number looks too long"),
});

export const shipmentSchema = z.object({
  supplierName: z.string().trim().min(1, "Supplier name is required"),
  supplierEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  shipmentDate: z
    .string()
    .min(1, "Shipment date is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  lines: z.array(lineSchema).min(1, "Add at least one product line"),
});

export type ShipmentInput = z.infer<typeof shipmentSchema>;
export type LineInput = z.infer<typeof lineSchema>;
