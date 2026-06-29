"use client";

import { useState } from "react";
import Link from "next/link";
import { BoxStatus, Carrier } from "@prisma/client";
import { CARRIER_LABEL, STATUS_META } from "@/lib/status";
import { QrScanner } from "@/components/QrScanner";

type FoundBox = {
  id: string;
  boxCode: string;
  boxNumber: number;
  productId: string;
  productName: string | null;
  productImage: string | null;
  trackingNumber: string;
  unitsPerBox: number;
  weightOfBox: number;
  carrier: Carrier;
  status: BoxStatus;
  shipment: { supplierName: string; code: string; poNumber: string | null };
};

export function ReceiveScanner() {
  const [query, setQuery] = useState("");
  const [box, setBox] = useState<FoundBox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Receiving form
  const [good, setGood] = useState(true);
  const [units, setUnits] = useState("");
  const [weight, setWeight] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [saving, setSaving] = useState(false);

  async function runLookup(code: string) {
    setError(null);
    setBox(null);
    setSavedMsg(null);
    const trimmed = code.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setLoading(true);
    const res = await fetch(`/api/boxes?code=${encodeURIComponent(trimmed)}`);
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Not found");
      return;
    }
    const b: FoundBox = data.box;
    setBox(b);
    setGood(true);
    setUnits(b.unitsPerBox?.toString() ?? "");
    setWeight(b.weightOfBox?.toString() ?? "");
    setReceivedBy("");
  }

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    runLookup(query);
  }

  async function patch(body: Record<string, unknown>, after: string) {
    if (!box) return;
    setSaving(true);
    const res = await fetch(`/api/boxes/${box.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      setBox({ ...box, status: body.status as BoxStatus });
      setSavedMsg(
        d.hasDiscrepancy
          ? `${after} — ⚠️ discrepancy flagged (received ≠ declared).`
          : after
      );
    } else {
      setError("Could not save. Try again.");
    }
  }

  function receive() {
    if (!receivedBy.trim()) {
      setError("Please enter who received this box.");
      return;
    }
    setError(null);
    patch(
      {
        status: "DELIVERED",
        unitsReceived: units === "" ? null : Number(units),
        weightReceived: weight === "" ? null : Number(weight),
        condition: good ? "GOOD" : "LOST_UNITS",
        receivedBy: receivedBy.trim(),
        detail: good ? "Received in good condition" : "Received NOT in good condition",
      },
      "✅ Marked Delivered."
    );
  }

  function addToStock() {
    patch({ status: "ADDED_IN_STOCK" }, "🏬 Added to Carbinox stock.");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={lookup} className="card p-4">
        <label className="label">Box code (scan the sticker QR) or tracking #</label>
        <div className="flex gap-2">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. SHP-7K3Q9P-001"
            autoFocus
            autoComplete="off"
          />
          <button className="btn" disabled={loading}>
            {loading ? "…" : "Find"}
          </button>
        </div>
        {error && <p className="err mt-2">{error}</p>}
        <div className="mt-3">
          <QrScanner onScan={(text) => runLookup(text)} />
        </div>
      </form>

      {savedMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {savedMsg}
        </div>
      )}

      {box && (
        <div className="card p-4">
          {/* Summary */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-ink">{box.boxCode}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_META[box.status].color}`}
            >
              {STATUS_META[box.status].emoji} {STATUS_META[box.status].label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 font-medium">
            {box.productImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={box.productImage} alt="" className="h-8 w-8 rounded object-cover" />
            )}
            <span>
              {box.productName ? `${box.productName} ` : ""}
              <span className="text-muted">({box.productId})</span>
            </span>
          </div>
          <div className="mt-1 text-sm text-muted">
            {box.shipment.supplierName} · {box.shipment.code}
            {box.shipment.poNumber ? ` · ${box.shipment.poNumber}` : ""} · {CARRIER_LABEL[box.carrier]}
            <br />
            Expected: {box.unitsPerBox} units · {box.weightOfBox} lbs
          </div>

          {/* Step: condition check */}
          {box.status !== "ADDED_IN_STOCK" && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className="label">Was this box received in good condition?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGood(true)}
                    className={`rounded-lg border px-4 py-1.5 text-sm font-medium ${good ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600"}`}
                  >
                    👍 Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setGood(false)}
                    className={`rounded-lg border px-4 py-1.5 text-sm font-medium ${!good ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 text-slate-600"}`}
                  >
                    👎 No (damaged / missing)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Units inside</label>
                  <input
                    className="input"
                    type="number"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Weight (lbs)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Received by *</label>
                  <input
                    className="input"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Name or initials"
                  />
                </div>
              </div>
              <button className="btn" onClick={receive} disabled={saving}>
                {saving ? "Saving…" : "📥 Mark received (Delivered)"}
              </button>
            </div>
          )}

          {/* Step: add to stock (separate, after delivered) */}
          {(box.status === "DELIVERED" || box.status === "DAMAGED") && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                className="btn bg-green-700 hover:bg-green-800"
                onClick={addToStock}
                disabled={saving}
              >
                ✅ Added to Carbinox stock
              </button>
            </div>
          )}

          <div className="mt-4">
            <Link href={`/dashboard`} className="text-sm text-muted hover:text-ink">
              Back to dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
