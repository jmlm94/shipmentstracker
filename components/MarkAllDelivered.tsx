"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";

// One-click "the whole shipment arrived": marks every undelivered box
// DELIVERED and credits its units to the linked purchase order.
export function MarkAllDelivered({
  shipmentId,
  code,
  pendingBoxes,
}: {
  shipmentId: string;
  code: string;
  pendingBoxes: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (pendingBoxes === 0) return null;

  async function run() {
    if (
      !confirm(
        `Mark all ${pendingBoxes} remaining box${pendingBoxes === 1 ? "" : "es"} of ${code} as delivered? Their units will be credited to the linked purchase order.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/deliver`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "Couldn't mark the shipment delivered.", "error");
        return;
      }
      toast(
        `${code} delivered — ${d.boxes} box${d.boxes === 1 ? "" : "es"}, ${d.units} units credited. ✅`,
        "success"
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={run} disabled={busy} className="btn-secondary">
      {busy ? "Marking…" : "✅ Mark all delivered"}
    </button>
  );
}
