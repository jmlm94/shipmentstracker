import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { runTrackingRefresh } from "@/lib/refreshTracking";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Manual "Refresh now" trigger from the dashboard.
export async function POST() {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runTrackingRefresh("manual");
  return NextResponse.json(result);
}
