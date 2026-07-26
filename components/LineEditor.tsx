"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";

// Inline editor to correct a shipment line after the fact (wrong box count,
// units per box, or tracking number). The API reconciles the actual Box rows.
export function LineEditor({
  shipmentId,
  lineId,
  boxCount,
  unitsPerBox,
  trackingNumber,
  trackingPerBox,
}: {
  shipmentId: string;
  lineId: string;
  boxCount: number;
  unitsPerBox: number;
  trackingNumber: string | null;
  trackingPerBox: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [boxes, setBoxes] = useState(String(boxCount));
  const [units, setUnits] = useState(String(unitsPerBox));
  const [tracking, setTracking] = useState(trackingNumber || "");

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/lines/${lineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boxCount: Number(boxes),
          unitsPerBox: Number(units),
          ...(trackingPerBox ? {} : { trackingNumber: tracking.trim() }),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "Couldn't save changes.", "error");
        return;
      }
      toast(
        `Line updated — ${d.boxes} box${d.boxes === 1 ? "" : "es"}${
          d.deleted > 0 ? ` (${d.deleted} removed)` : ""
        }. ✅`,
        "success"
      );
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary shrink-0 text-xs">
        ✏️ Edit line
      </button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <div>
        <label className="label">Boxes</label>
        <input
          className="input w-24"
          type="number"
          min={1}
          value={boxes}
          onChange={(e) => setBoxes(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Units / box</label>
        <input
          className="input w-28"
          type="number"
          min={1}
          value={units}
          onChange={(e) => setUnits(e.target.value)}
        />
      </div>
      {!trackingPerBox && (
        <div className="min-w-[220px] flex-1">
          <label className="label">Tracking number (all boxes)</label>
          <input
            className="input font-mono"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="btn">
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setOpen(false)} disabled={busy} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
