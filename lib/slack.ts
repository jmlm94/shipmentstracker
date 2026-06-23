// Posts a message to Slack via an Incoming Webhook. No-op (logs only) when
// SLACK_WEBHOOK_URL is not configured, so the app works without Slack set up.

export async function sendSlack(text: string, blocks?: unknown[]): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.log("[slack] (not configured) would send:", text);
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blocks ? { text, blocks } : { text }),
    });
    if (!res.ok) {
      console.error("[slack] failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[slack] error:", err);
    return false;
  }
}

export function formatStatusChange(args: {
  productName: string | null;
  productId: string;
  trackingNumber: string;
  carrier: string;
  supplierName: string;
  fromStatus: string | null;
  toStatus: string;
  detail?: string | null;
}): string {
  const name = args.productName ? `${args.productName} (${args.productId})` : args.productId;
  const from = args.fromStatus ? `${args.fromStatus} → ` : "";
  return (
    `:package: *${name}* — ${from}*${args.toStatus}*\n` +
    `Tracking \`${args.trackingNumber}\` · ${args.carrier} · Supplier: ${args.supplierName}` +
    (args.detail ? `\n_${args.detail}_` : "")
  );
}
