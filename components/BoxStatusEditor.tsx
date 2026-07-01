"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BoxStatus } from "@prisma/client";
import { allowedNextStatuses, STATUS_META } from "@/lib/status";
import { toast } from "@/components/Toaster";

export function BoxStatusEditor({
  boxId,
  current,
  weightOfBox,
  weightReceived,
  unitsReceived,
  condition,
}: {
  boxId: string;
  current: BoxStatus;
  weightOfBox: number;
  weightReceived: number | null;
  unitsReceived: number | null;
  condition: "GOOD" | "LOST_UNITS" | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<BoxStatus>(current);
  const [wr, setWr] = useState(weightReceived?.toString() ?? "");
  const [ur, setUr] = useState(unitsReceived?.toString() ?? "");
  const [cond, setCond] = useState<string>(condition ?? "");
  const [note, setNote] = useState("");
  const options = allowedNextStatuses(current);

  // Receiving fields are relevant once the box has arrived.
  const receiving = ["DELIVERED", "ADDED_IN_STOCK", "LOST"].includes(status);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/boxes/${boxId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        weightReceived: wr === "" ? null : Number(wr),
        unitsReceived: ur === "" ? null : Number(ur),
        condition: cond === "" ? null : cond,
        detail: note.trim() || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      toast("Could not save. Please try again.", "error");
    }
  }

  if (!open) {
    return (
      <button className="text-xs font-medium text-slate-600 hover:underline" onClick={() => setOpen(true)}>
        Update
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">New status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as BoxStatus)}
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].emoji} {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        {receiving && (
          <>
            <div>
              <label className="label">Weight received (declared {weightOfBox} lbs)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={wr}
                onChange={(e) => setWr(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Units received</label>
              <input
                className="input"
                type="number"
                value={ur}
                onChange={(e) => setUr(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="input" value={cond} onChange={(e) => setCond(e.target.value)}>
                <option value="">—</option>
                <option value="GOOD">Good</option>
                <option value="LOST_UNITS">Lost units</option>
              </select>
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className="label">Note (optional)</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this status change"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn-secondary" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
