import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Uploads one or more photos for a box (damage / lost-units evidence) to Vercel
// Blob storage and records them. Requires a Blob store (BLOB_READ_WRITE_TOKEN),
// which Vercel sets automatically when you add Blob storage to the project.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Photo storage isn't set up yet. Add Vercel Blob storage to enable uploads." },
      { status: 503 }
    );
  }

  const box = await prisma.box.findUnique({ where: { id: params.id } });
  if (!box) return NextResponse.json({ error: "Box not found" }, { status: 404 });

  const form = await req.formData();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const created = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const blob = await put(`boxes/${box.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    const photo = await prisma.boxPhoto.create({
      data: { boxId: box.id, url: blob.url },
    });
    created.push(photo);
  }

  return NextResponse.json({ ok: true, photos: created });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const photoId = new URL(req.url).searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ error: "Missing photoId" }, { status: 400 });
  await prisma.boxPhoto.deleteMany({ where: { id: photoId, boxId: params.id } });
  return NextResponse.json({ ok: true });
}
