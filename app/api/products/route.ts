import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pick the first header (case-insensitive) that matches one of the candidates.
function findKey(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx !== -1) return headers[idx];
  }
  // loose contains match
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function firstUrl(v: string): string | null {
  if (!v) return null;
  const m = v.match(/https?:\/\/[^\s,"']+/);
  return m ? m[0] : null;
}

// Imports a Sortly (or any) CSV export and REPLACES the product catalog so it
// matches the source exactly. Body is the raw CSV text.
export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const csv = await req.text();
  if (!csv.trim()) return NextResponse.json({ error: "Empty file" }, { status: 400 });

  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  const rows = parsed.data;
  const headers = parsed.meta.fields || [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in the CSV" }, { status: 400 });
  }

  const nameKey = findKey(headers, ["name", "item name", "entry name", "title", "product", "item"]);
  const skuKey = findKey(headers, ["sku", "barcode", "item id", "id"]);
  const imageKey = findKey(headers, ["photo", "photos", "image", "image url", "photo url", "picture"]);

  if (!nameKey) {
    return NextResponse.json(
      { error: `Couldn't find a product name column. Headers seen: ${headers.join(", ")}` },
      { status: 422 }
    );
  }

  const products = rows
    .map((r) => {
      const name = (r[nameKey] || "").trim();
      if (!name) return null;
      return {
        name,
        sku: skuKey ? (r[skuKey] || "").trim() || null : null,
        image: imageKey ? firstUrl(r[imageKey] || "") : null,
        source: "sortly",
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (products.length === 0) {
    return NextResponse.json({ error: "No usable rows (every name was blank)" }, { status: 422 });
  }

  // Full replace: the catalog should mirror the uploaded export.
  await prisma.$transaction([
    prisma.product.deleteMany({}),
    prisma.product.createMany({ data: products }),
  ]);

  return NextResponse.json({
    ok: true,
    imported: products.length,
    mapped: { name: nameKey, sku: skuKey, image: imageKey },
  });
}

export async function DELETE() {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.product.deleteMany({});
  return NextResponse.json({ ok: true });
}
