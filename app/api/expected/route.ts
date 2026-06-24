import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

const schema = z.object({
  supplierName: z.string().trim().min(1, "Supplier is required").max(120),
  expectedDate: z.string().optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        productName: z.string().trim().min(1).max(200),
        productImage: z.string().trim().max(500).optional().nullable(),
        expectedUnits: z.coerce.number().int().positive(),
      })
    )
    .min(1, "Add at least one product"),
});

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 422 }
    );
  }
  const d = parsed.data;
  const arrival = await prisma.expectedArrival.create({
    data: {
      supplierName: d.supplierName,
      expectedDate: d.expectedDate ? new Date(d.expectedDate) : null,
      note: d.note || null,
      items: {
        create: d.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          productImage: it.productImage || null,
          expectedUnits: it.expectedUnits,
        })),
      },
    },
  });
  return NextResponse.json({ id: arrival.id });
}
