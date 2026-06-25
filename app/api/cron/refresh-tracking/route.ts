import { NextResponse } from "next/server";
import { runTrackingRefresh } from "@/lib/refreshTracking";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Runs daily (Vercel Cron): refresh carrier tracking + overdue alerts.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runTrackingRefresh("cron");
  return NextResponse.json(result);
}
