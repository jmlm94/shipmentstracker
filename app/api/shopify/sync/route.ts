import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { runShopifySync } from "@/lib/shopifySync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runShopifySync();
  if ("error" in result) return NextResponse.json(result, { status: 503 });
  return NextResponse.json({ ok: true, ...result });
}
