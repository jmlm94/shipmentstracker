import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  sku: z.string().trim().max(80).optional().nullable(),
  image: z.string().trim().max(3_000_000).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 422 }
    );
  }
  const data: Record<string, string | null> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.sku !== undefined) data.sku = parsed.data.sku || null;
  if (parsed.data.image !== undefined) data.image = parsed.data.image || null;

  await prisma.product.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
