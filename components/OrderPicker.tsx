"use client";

import { useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  code: string;
  supplierName: string;
  items: { name: string; qty: number }[];
};

export function OrderPicker({
  poNumber,
  onChange,
  error,
}: {
  poNumber: string;
  onChange: (code: string, id: string | null) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open && orders.length === 0) {
      fetch("/api/public/orders")
        .then((r) => r.json())
        .then((d) => setOrders(d.orders || []))
        .catch(() => setOrders([]));
    }
  }, [open, orders.length]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        o.supplierName.toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q))
    );
  }, [orders, query]);

  if (manual) {
    return (
      <div>
        <input
          className={`input ${error ? "border-red-400" : ""}`}
          value={poNumber}
          onChange={(e) => onChange(e.target.value, null)}
          placeholder="e.g. PO-0001"
        />
        <button
          type="button"
          onClick={() => setManual(false)}
          className="mt-1 text-xs text-blue-600 hover:underline"
        >
          ← Find my order in the list instead
        </button>
        {error && <p className="err">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left ${
          error ? "border-red-400" : "border-slate-300 hover:border-slate-400"
        }`}
      >
        {poNumber ? (
          <span className="font-medium">📄 {poNumber}</span>
        ) : (
          <span className="text-sm text-slate-400">🔎 Find your purchase order…</span>
        )}
        <span className="text-xs text-blue-600">{poNumber ? "Change" : "Browse"}</span>
      </button>
      <button
        type="button"
        onClick={() => setManual(true)}
        className="mt-1 text-xs text-muted hover:text-ink hover:underline"
      >
        My order isn&apos;t listed — enter a PO number manually
      </button>
      {error && <p className="err">{error}</p>}

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="mt-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:mt-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 p-3">
              <input
                autoFocus
                className="input flex-1"
                placeholder="Search by PO number, your company, or product…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary shrink-0">
                Close
              </button>
            </div>
            <div className="overflow-auto p-2">
              {results.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted">
                  No matching open orders. Use &quot;enter a PO number manually&quot; if you
                  don&apos;t see yours.
                </div>
              )}
              {results.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(o.code, o.id);
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg border border-slate-100 p-3 text-left hover:border-orange-400 hover:bg-orange-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold">{o.code}</span>
                    <span className="text-sm font-medium">{o.supplierName}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-muted">
                    {o.items.map((it) => `${it.qty}× ${it.name}`).join(" · ")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
