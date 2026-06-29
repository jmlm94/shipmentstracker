import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Add a note (text and/or a file attachment) to a purchase order.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
  if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }
  const text = (form.get("text") as string | null)?.trim() || null;
  const file = form.get("file");

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileType: string | null = null;

  if (file instanceof File && file.size > 0) {
    fileName = file.name;
    fileType = file.type || "application/octet-stream";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: "File is too large (max 25 MB)." }, { status: 413 });
      }
      const blob = await put(`po-notes/${po.id}/${file.name}`, file, {
        access: "public",
        addRandomSuffix: true,
      });
      fileUrl = blob.url;
    } else {
      // No Blob configured — store a data URI (kept small to protect the DB).
      if (file.size > 1.5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File is too large for direct storage (max 1.5 MB). Add Vercel Blob storage for bigger files." },
          { status: 413 }
        );
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      fileUrl = `data:${fileType};base64,${bytes.toString("base64")}`;
    }
  }

  if (!text && !fileUrl) {
    return NextResponse.json({ error: "Add a note or attach a file." }, { status: 400 });
  }

  const note = await prisma.poNote.create({
    data: { purchaseOrderId: po.id, text, fileUrl, fileName, fileType },
  });

  return NextResponse.json({
    ok: true,
    note: {
      id: note.id,
      text: note.text,
      fileUrl: note.fileUrl,
      fileName: note.fileName,
      fileType: note.fileType,
      createdAt: note.createdAt.toISOString(),
    },
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const noteId = new URL(req.url).searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
  await prisma.poNote.deleteMany({ where: { id: noteId, purchaseOrderId: params.id } });
  return NextResponse.json({ ok: true });
}
