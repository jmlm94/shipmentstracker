import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { sendSlack } from "@/lib/slack";

export const dynamic = "force-dynamic";

// Fires a test message through the configured Slack webhook so you can confirm
// the integration end to end.
export async function POST() {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.SLACK_WEBHOOK_URL) {
    return NextResponse.json(
      { ok: false, configured: false, error: "SLACK_WEBHOOK_URL is not set in this deployment." },
      { status: 200 }
    );
  }

  const sent = await sendSlack(
    ":white_check_mark: *Carbinox Shipments Tracker is connected to Slack.*\n" +
      "You'll get alerts here for new shipments, status changes (in transit → out for delivery → delivered), and overdue packages. _This is a test message._"
  );

  return NextResponse.json({
    ok: sent,
    configured: true,
    error: sent ? null : "Slack rejected the message — double-check the webhook URL.",
  });
}
