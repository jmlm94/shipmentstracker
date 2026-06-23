import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

const schema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(60),
  name: z.string().trim().min(1, "Name is required").max(120),
  tier: z.enum(["A", "B", "C"]).default("A"),
  unitsPerBox: z.coerce.number().int().positive().optional().nullable(),
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

  const exists = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (exists) {
    return NextResponse.json({ error: "A product with this SKU already exists" }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: {
      sku: parsed.data.sku,
      name: parsed.data.name,
      tier: parsed.data.tier,
      unitsPerBox: parsed.data.unitsPerBox ?? null,
    },
  });
  return NextResponse.json(product);
}
