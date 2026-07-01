import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { isDataUri, decodeDataUri, extensionFor } from "@/lib/images";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Moves images/files stored as base64 data URIs in the database to Vercel
// Blob (real CDN URLs). Runs in batches to stay inside the function time
// limit — click the button again until remaining is 0. Idempotent: already-
// hosted URLs are skipped.
const BATCH = 15;

type Target = {
  label: string;
  count: () => Promise<number>;
  migrate: (budget: number) => Promise<number>;
};

async function upload(prefix: string, id: string, uri: string): Promise<string | null> {
  const decoded = decodeDataUri(uri);
  if (!decoded) return null;
  const blob = await put(`${prefix}/${id}.${extensionFor(decoded.mime)}`, decoded.bytes, {
    access: "public",
    addRandomSuffix: true,
    contentType: decoded.mime,
  });
  return blob.url;
}

export async function POST() {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Vercel Blob isn't configured. Add BLOB_READ_WRITE_TOKEN in Vercel first (Storage → Blob)." },
      { status: 400 }
    );
  }

  const dataUriWhere = { startsWith: "data:" } as const;

  const targets: Target[] = [
    {
      label: "product images",
      count: () => prisma.product.count({ where: { image: dataUriWhere } }),
      migrate: async (budget) => {
        const rows = await prisma.product.findMany({ where: { image: dataUriWhere }, take: budget });
        let n = 0;
        for (const r of rows) {
          if (!isDataUri(r.image)) continue;
          const url = await upload("products", r.id, r.image);
          if (url) {
            await prisma.product.update({ where: { id: r.id }, data: { image: url } });
            n++;
          }
        }
        return n;
      },
    },
    {
      label: "order item images",
      count: () => prisma.purchaseOrderItem.count({ where: { productImage: dataUriWhere } }),
      migrate: async (budget) => {
        const rows = await prisma.purchaseOrderItem.findMany({ where: { productImage: dataUriWhere }, take: budget });
        let n = 0;
        for (const r of rows) {
          if (!isDataUri(r.productImage)) continue;
          const url = await upload("po-items", r.id, r.productImage);
          if (url) {
            await prisma.purchaseOrderItem.update({ where: { id: r.id }, data: { productImage: url } });
            n++;
          }
        }
        return n;
      },
    },
    {
      label: "shipment line images",
      count: () => prisma.shipmentLine.count({ where: { productImage: dataUriWhere } }),
      migrate: async (budget) => {
        const rows = await prisma.shipmentLine.findMany({ where: { productImage: dataUriWhere }, take: budget });
        let n = 0;
        for (const r of rows) {
          if (!isDataUri(r.productImage)) continue;
          const url = await upload("lines", r.id, r.productImage);
          if (url) {
            await prisma.shipmentLine.update({ where: { id: r.id }, data: { productImage: url } });
            n++;
          }
        }
        return n;
      },
    },
    {
      label: "box images",
      count: () => prisma.box.count({ where: { productImage: dataUriWhere } }),
      migrate: async (budget) => {
        const rows = await prisma.box.findMany({ where: { productImage: dataUriWhere }, take: budget });
        let n = 0;
        for (const r of rows) {
          if (!isDataUri(r.productImage)) continue;
          const url = await upload("boxes", r.id, r.productImage);
          if (url) {
            await prisma.box.update({ where: { id: r.id }, data: { productImage: url } });
            n++;
          }
        }
        return n;
      },
    },
    {
      label: "box photos",
      count: () => prisma.boxPhoto.count({ where: { url: dataUriWhere } }),
      migrate: async (budget) => {
        const rows = await prisma.boxPhoto.findMany({ where: { url: dataUriWhere }, take: budget });
        let n = 0;
        for (const r of rows) {
          if (!isDataUri(r.url)) continue;
          const url = await upload("box-photos", r.id, r.url);
          if (url) {
            await prisma.boxPhoto.update({ where: { id: r.id }, data: { url } });
            n++;
          }
        }
        return n;
      },
    },
    {
      label: "payment screenshots",
      count: () => prisma.poPayment.count({ where: { url: dataUriWhere } }),
      migrate: async (budget) => {
        const rows = await prisma.poPayment.findMany({ where: { url: dataUriWhere }, take: budget });
        let n = 0;
        for (const r of rows) {
          if (!isDataUri(r.url)) continue;
          const url = await upload("payments", r.id, r.url);
          if (url) {
            await prisma.poPayment.update({ where: { id: r.id }, data: { url } });
            n++;
          }
        }
        return n;
      },
    },
    {
      label: "note attachments",
      count: () => prisma.poNote.count({ where: { fileUrl: dataUriWhere } }),
      migrate: async (budget) => {
        const rows = await prisma.poNote.findMany({ where: { fileUrl: dataUriWhere }, take: budget });
        let n = 0;
        for (const r of rows) {
          if (!isDataUri(r.fileUrl)) continue;
          const url = await upload("notes", r.id, r.fileUrl);
          if (url) {
            await prisma.poNote.update({ where: { id: r.id }, data: { fileUrl: url } });
            n++;
          }
        }
        return n;
      },
    },
  ];

  let migrated = 0;
  try {
    for (const t of targets) {
      if (migrated >= BATCH) break;
      migrated += await t.migrate(BATCH - migrated);
    }
  } catch (e) {
    console.error("[migrate-images]", e);
    return NextResponse.json(
      { error: "Upload to Blob failed part-way. Progress was saved — try again.", migrated },
      { status: 502 }
    );
  }

  const counts = await Promise.all(targets.map((t) => t.count()));
  const remaining = counts.reduce((s, c) => s + c, 0);
  return NextResponse.json({ ok: true, migrated, remaining });
}
