import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Upload a product image to Vercel Blob and set it on the product. The supplier
// form and pickers read Product.image, so the new picture shows up everywhere.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get("image") as File | null;
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Please upload an image file." }, { status: 400 });
  }

  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

  // Preferred: Vercel Blob (a real CDN URL). Allows large files.
  if (hasBlob) {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image is too large (max 10 MB)." }, { status: 413 });
    }
    const blob = await put(`products/${product.id}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    await prisma.product.update({ where: { id: product.id }, data: { image: blob.url } });
    return NextResponse.json({ ok: true, url: blob.url });
  }

  // Fallback (no Blob storage configured): store a data URI in the database so
  // uploads work with zero setup. Capped smaller to keep catalog payloads light.
  if (file.size > 1.5 * 1024 * 1024) {
    return NextResponse.json(
      {
        error:
          "Image is too large for direct storage (max 1.5 MB). Use a smaller image, or add Vercel Blob storage for larger files.",
      },
      { status: 413 }
    );
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;
  await prisma.product.update({ where: { id: product.id }, data: { image: dataUri } });
  return NextResponse.json({ ok: true, url: dataUri });
}
