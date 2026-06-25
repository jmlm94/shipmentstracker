"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshTrackingButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    await fetch("/api/tracking/refresh", { method: "POST" }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
    >
      {busy ? "Refreshing…" : "🔄 Refresh now"}
    </button>
  );
}
