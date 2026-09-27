import { NextResponse } from "next/server";
import { runShopifySync } from "@/lib/shopifySync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily (Vercel Cron): pull yesterday's Shopify sales + current inventory.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await runShopifySync();
  return NextResponse.json(result);
}
