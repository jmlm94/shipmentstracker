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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Image storage isn't set up yet. Add Vercel Blob storage to enable uploads." },
      { status: 503 }
    );
  }

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
