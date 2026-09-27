"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";

export function SyncShopifyButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/shopify/sync", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "Sync failed.", "error");
        return;
      }
      toast(`Synced — ${d.linked} linked product${d.linked === 1 ? "" : "s"}, sales since ${d.since}. ✅`, "success");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={run} disabled={busy} className="btn-secondary">
      {busy ? "⏳ Syncing…" : "🔄 Sync from Shopify"}
    </button>
  );
}
