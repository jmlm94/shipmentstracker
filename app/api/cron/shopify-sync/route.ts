import { NextResponse } from "next/server";
import { runShopifySync } from "@/lib/shopifySync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily (Vercel Cron): pull yesterday's Shopify sales + current inventory.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const full = new URL(req.url).searchParams.get("full") === "1";
  const result = await runShopifySync(full);
  return NextResponse.json(result);
}
