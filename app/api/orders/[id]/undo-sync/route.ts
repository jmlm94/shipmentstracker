import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { undoLastManualSync } from "@/lib/undoSync";

export const dynamic = "force-dynamic";

// Restores received counts wiped by the removed "Sync received" button,
// reconstructed from the order's activity log.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await undoLastManualSync(params.id);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ok: true, ...result });
}
