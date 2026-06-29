"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  productName: string;
  productImage: string | null;
  sku: string | null;
  quantity: number;
  receivedQty: number;
  fromBoxes: number;
};

export function ReceivePanel({ orderId, items }: { orderId: string; items: Item[] }) {
  const router = useRouter();
  const [recv, setRecv] = useState<Record<string, string>>(
    Object.fromEntries(items.map((it) => [it.id, String(it.receivedQty)]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(id: string, value: string) {
    setSaved(false);
    setRecv((r) => ({ ...r, [id]: value }));
  }
  function setAll(id: string, qty: number) {
    set(id, String(qty));
  }
  function markAll() {
    setSaved(false);
    setRecv(Object.fromEntries(items.map((it) => [it.id, String(it.quantity)])));
  }

  const totalOrdered = items.reduce((s, it) => s + it.quantity, 0);
  const totalReceived = items.reduce(
    (s, it) => s + Math.min(it.quantity, Math.max(0, Number(recv[it.id]) || 0)),
    0
  );

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/orders/${orderId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({ id: it.id, receivedQty: Number(recv[it.id]) || 0 })),
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="card divide-y divide-slate-100 overflow-hidden">
        {items.map((it) => {
          const val = Math.min(it.quantity, Math.max(0, Number(recv[it.id]) || 0));
          const remaining = it.quantity - val;
          const done = remaining <= 0;
          return (
            <div key={it.id} className="flex flex-wrap items-center gap-3 p-3">
              {it.productImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.productImage} alt="" className="h-12 w-12 shrink-0 rounded-md border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-lg">📦</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{it.productName}</div>
                <div className="text-xs text-muted">
                  Ordered {it.quantity}
                  {it.sku ? ` · ${it.sku}` : ""}
                  {it.fromBoxes > 0 ? ` · 📦 ${it.fromBoxes} from scans` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <label className="sr-only">Received</label>
                  <input
                    className="input w-24 text-center"
                    type="number"
                    min={0}
                    max={it.quantity}
                    value={recv[it.id]}
                    onChange={(e) => set(it.id, e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAll(it.id, it.quantity)}
                  className="btn-secondary px-2.5 py-1.5 text-xs"
                >
                  ✓ All
                </button>
                <span className={`w-20 text-right text-xs ${done ? "text-emerald-600" : "text-amber-700"}`}>
                  {done ? "Complete" : `${remaining} left`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={markAll} className="btn-secondary">
            ✓ Mark everything received
          </button>
          <span className="text-sm text-muted">
            {totalReceived} / {totalOrdered} units
          </span>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm font-medium text-emerald-600">✅ Saved</span>}
          <button onClick={save} disabled={saving} className="btn">
            {saving ? "Saving…" : "Save receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}
