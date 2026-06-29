"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type TrackItem = {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  sku: string | null;
  quantity: number;
  remaining: number;
};
export type TrackOrder = { id: string; code: string; supplier: string; items: TrackItem[] };

const CARRIERS: [string, string][] = [
  ["UPS", "UPS"],
  ["FEDEX", "FedEx"],
  ["USPS", "USPS"],
  ["DHL", "DHL"],
  ["OTHER", "Others"],
];

type Row = { units: string; carrier: string; tracking: string; include: boolean };

export function QuickTrackForm({ orders, preselectId }: { orders: TrackOrder[]; preselectId: string | null }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const valid = preselectId && orders.some((o) => o.id === preselectId) ? preselectId : "";
  const [selectedId, setSelectedId] = useState(valid || (orders[0]?.id ?? ""));
  const [shipmentDate, setShipmentDate] = useState(today);
  const [method, setMethod] = useState("AIR");
  const [mode, setMode] = useState<"ORDER" | "PER_ITEM">("ORDER");
  const [orderCarrier, setOrderCarrier] = useState("");
  const [orderTracking, setOrderTracking] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const order = useMemo(() => orders.find((o) => o.id === selectedId) || null, [orders, selectedId]);

  // Reset per-item rows when the selected order changes.
  useEffect(() => {
    if (!order) return setRows({});
    setRows(
      Object.fromEntries(
        order.items.map((it) => [
          it.id,
          { units: String(it.remaining || it.quantity), carrier: "", tracking: "", include: it.remaining > 0 },
        ])
      )
    );
  }, [order]);

  function setRow(id: string, patch: Partial<Row>) {
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!order) return setError("Pick a purchase order.");

    const lines = order.items
      .filter((it) => rows[it.id]?.include && Number(rows[it.id]?.units) > 0)
      .map((it) => {
        const r = rows[it.id];
        return {
          productId: it.productId,
          productName: it.productName,
          productImage: it.productImage || "",
          sku: it.sku || "",
          units: Number(r.units),
          carrier: mode === "ORDER" ? orderCarrier : r.carrier,
          trackingNumber: (mode === "ORDER" ? orderTracking : r.tracking).trim(),
        };
      });

    if (lines.length === 0) return setError("Include at least one product with units.");
    for (const l of lines) {
      if (!l.carrier) return setError("Select a carrier.");
      if (!l.trackingNumber) return setError("Enter the tracking number.");
    }

    setSaving(true);
    const res = await fetch("/api/shipments/quick-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseOrderId: order.id, shipmentDate, method, lines }),
    });
    setSaving(false);
    if (res.ok) {
      const dd = await res.json();
      router.push(`/dashboard/${dd.id}`);
    } else {
      const dd = await res.json().catch(() => ({}));
      setError(dd.error || "Could not save.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="label">Purchase order *</label>
            <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} · {o.supplier}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Shipment date</label>
            <input className="input" type="date" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="AIR">Air ✈️</option>
              <option value="SEA">Sea 🚢</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-4 text-sm">
          <span className="font-medium">Tracking number:</span>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === "ORDER"} onChange={() => setMode("ORDER")} />
            One for the whole order
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === "PER_ITEM"} onChange={() => setMode("PER_ITEM")} />
            One per product
          </label>
        </div>

        {mode === "ORDER" && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
            <div>
              <label className="label">Carrier *</label>
              <select className="input" value={orderCarrier} onChange={(e) => setOrderCarrier(e.target.value)}>
                <option value="">—</option>
                {CARRIERS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tracking number *</label>
              <input className="input" value={orderTracking} onChange={(e) => setOrderTracking(e.target.value)} placeholder="e.g. 1Z999AA10123456784" />
            </div>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Products covered
        </h2>
        <div className="space-y-2">
          {order?.items.map((it) => {
            const r = rows[it.id];
            if (!r) return null;
            return (
              <div key={it.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={r.include}
                    onChange={(e) => setRow(it.id, { include: e.target.checked })}
                  />
                  {it.productImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.productImage} alt="" className="h-9 w-9 shrink-0 rounded border border-slate-200 object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-sm">📦</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.productName}</div>
                    <div className="text-xs text-muted">
                      Ordered {it.quantity} · remaining {it.remaining}
                    </div>
                  </div>
                  <div className="w-24">
                    <label className="label">Units</label>
                    <input
                      className="input py-1.5"
                      type="number"
                      min={1}
                      value={r.units}
                      disabled={!r.include}
                      onChange={(e) => setRow(it.id, { units: e.target.value })}
                    />
                  </div>
                </div>
                {mode === "PER_ITEM" && r.include && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr]">
                    <select className="input py-1.5" value={r.carrier} onChange={(e) => setRow(it.id, { carrier: e.target.value })}>
                      <option value="">Carrier…</option>
                      {CARRIERS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input py-1.5"
                      value={r.tracking}
                      onChange={(e) => setRow(it.id, { tracking: e.target.value })}
                      placeholder="Tracking number"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button className="btn" disabled={saving}>
          {saving ? "Saving…" : "🏷️ Attach tracking"}
        </button>
      </div>
    </form>
  );
}
