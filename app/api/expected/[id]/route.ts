import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

const schema = z.object({
  status: z.enum(["EXPECTED", "ARRIVED", "CANCELLED"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  await prisma.expectedArrival.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.expectedArrival.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
