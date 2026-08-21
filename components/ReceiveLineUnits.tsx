"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";

// Record a partial delivery on one shipment line by unit count. Boxes are
// marked delivered in box order until the entered count is covered.
export function ReceiveLineUnits({
  shipmentId,
  lineId,
  productName,
  pendingUnits,
}: {
  shipmentId: string;
  lineId: string;
  productName: string;
  pendingUnits: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState(String(pendingUnits));
  const [busy, setBusy] = useState(false);

  if (pendingUnits === 0) return null;

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/lines/${lineId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units: Number(units) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "Couldn't record the delivery.", "error");
        return;
      }
      toast(
        `${d.units} × ${productName} received — ${d.boxes} box${d.boxes === 1 ? "" : "es"} delivered${
          d.partial > 0 ? ` (${d.partial} partial — flagged)` : ""
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
      <button
        type="button"
        onClick={() => {
          setUnits(String(pendingUnits));
          setOpen(true);
        }}
        className="btn-secondary shrink-0 text-xs"
      >
        📦 Receive units
      </button>
    );
  }

  const n = Number(units);
  const valid = Number.isInteger(n) && n >= 1 && n <= pendingUnits;

  return (
    <div className="flex w-full flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <div>
        <label className="label">Units delivered</label>
        <input
          autoFocus
          className="input w-32"
          type="number"
          min={1}
          max={pendingUnits}
          value={units}
          onChange={(e) => setUnits(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-muted">{pendingUnits} still on the way</p>
      </div>
      <div className="flex gap-2 pb-5">
        <button onClick={save} disabled={!valid || busy} className="btn">
          {busy ? "Recording…" : "Record delivery"}
        </button>
        <button onClick={() => setOpen(false)} disabled={busy} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
