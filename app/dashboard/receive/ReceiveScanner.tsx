"use client";

import { useState } from "react";
import Link from "next/link";
import { BoxStatus } from "@prisma/client";
import { ALL_STATUSES, STATUS_META } from "@/lib/status";

type FoundBox = {
  id: string;
  boxNumber: number;
  productId: string;
  productName: string | null;
  trackingNumber: string;
  unitsPerBox: number;
  weightOfBox: number;
  status: BoxStatus;
  shipment: { supplierName: string; carrier: string };
};

const CARRIER_LABEL: Record<string, string> = { FEDEX: "FedEx", DHL: "DHL", UPS: "UPS" };

export function ReceiveScanner() {
  const [tracking, setTracking] = useState("");
  const [box, setBox] = useState<FoundBox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Update form state
  const [status, setStatus] = useState<BoxStatus>("ADDED_IN_STOCK");
  const [wr, setWr] = useState("");
  const [ur, setUr] = useState("");
  const [cond, setCond] = useState("GOOD");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBox(null);
    setSaved(false);
    if (!tracking.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/boxes?tracking=${encodeURIComponent(tracking.trim())}`);
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Not found");
      return;
    }
    const b: FoundBox = data.box;
    setBox(b);
    setStatus("ADDED_IN_STOCK");
    setWr(b.weightOfBox?.toString() ?? "");
    setUr(b.unitsPerBox?.toString() ?? "");
    setCond("GOOD");
  }

  async function save() {
    if (!box) return;
    setSaving(true);
    const res = await fetch(`/api/boxes/${box.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        weightReceived: wr === "" ? null : Number(wr),
        unitsReceived: ur === "" ? null : Number(ur),
        condition: cond === "" ? null : cond,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setBox({ ...box, status });
      setTracking("");
    } else {
      setError("Could not save. Try again.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={lookup} className="card p-4">
        <label className="label">Tracking number</label>
        <div className="flex gap-2">
          <input
            className="input"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Scan or type…"
            autoFocus
            autoComplete="off"
          />
          <button className="btn" disabled={loading}>
            {loading ? "…" : "Find"}
          </button>
        </div>
        {error && <p className="err mt-2">{error}</p>}
      </form>

      {saved && !box?.id && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Saved. Scan the next box.
        </div>
      )}

      {box && (
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Box #{box.boxNumber}</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_META[box.status].color}`}
            >
              {STATUS_META[box.status].label}
            </span>
          </div>
          <div className="mt-1 font-medium">
            {box.productName ? `${box.productName} ` : ""}
            <span className="text-muted">({box.productId})</span>
          </div>
          <div className="mt-1 text-sm text-muted">
            {box.shipment.supplierName} · {CARRIER_LABEL[box.shipment.carrier]} ·{" "}
            {box.unitsPerBox} units · declared {box.weightOfBox} lbs
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Set status</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as BoxStatus)}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Weight received (lbs)</label>
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
                <option value="GOOD">Good</option>
                <option value="LOST_UNITS">Lost units</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save & next"}
            </button>
            <Link href={`/dashboard`} className="text-sm text-muted hover:text-ink">
              View all shipments
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
