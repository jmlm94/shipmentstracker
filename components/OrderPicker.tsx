"use client";

import { useEffect, useMemo, useState } from "react";

type Item = { productId?: string; name: string; image: string; sku: string; qty: number };
type Order = {
  id: string;
  code: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string | null;
  totalUnits: number;
  items: Item[];
};

export function OrderPicker({
  poNumber,
  onChange,
  error,
}: {
  poNumber: string;
  // productIds: the products on the selected order (undefined when the PO was
  // typed manually, so the form can't restrict the product list).
  onChange: (code: string, id: string | null, productIds?: string[]) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null); // order being confirmed

  // Refetch every time the picker opens so a PO created moments ago shows up.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    setViewing(null);
    fetch("/api/public/orders", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!active) return;
        setOrders(d.orders || []);
      })
      .catch((e) => {
        if (!active) return;
        setLoadError("Couldn't load orders. Check your connection and try again.");
        console.error("OrderPicker load failed:", e);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open]);

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

  function confirmOrder(o: Order) {
    onChange(
      o.code,
      o.id,
      o.items.map((it) => it.productId || "").filter(Boolean)
    );
    setOpen(false);
    setViewing(null);
    setQuery("");
  }

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
            className="mt-4 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:mt-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-slate-200 p-4">
              {viewing ? (
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="btn-secondary shrink-0"
                >
                  ← Back
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold">
                  {viewing ? "Confirm your order" : "Find your purchase order"}
                </h3>
                {!viewing && (
                  <p className="text-xs text-muted">Pick the order we created for your shipment.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {viewing ? (
              /* ---- Detail / confirm view ---- */
              <>
                <div className="overflow-auto p-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-lg font-bold">{viewing.code}</span>
                      <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-ink">
                        {viewing.totalUnits} units
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium">{viewing.supplierName}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
                      <span>📅 Ordered {viewing.orderDate}</span>
                      {viewing.expectedDate && <span>🎯 Expected {viewing.expectedDate}</span>}
                    </div>
                  </div>

                  <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                    Products in this order ({viewing.items.length})
                  </div>
                  <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                    {viewing.items.map((it, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5">
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.image}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-md border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-base">
                            📦
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{it.name}</div>
                          {it.sku && <div className="truncate text-[11px] text-muted">{it.sku}</div>}
                        </div>
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold tabular-nums">
                          ×{it.qty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm bar */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4">
                  <span className="text-sm text-muted">Is this the right order?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setViewing(null)} className="btn-secondary">
                      No, go back
                    </button>
                    <button type="button" onClick={() => confirmOrder(viewing)} className="btn">
                      ✓ Yes, this is my order
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* ---- List view ---- */
              <>
                <div className="border-b border-slate-100 p-3">
                  <input
                    autoFocus
                    className="input"
                    placeholder="Search by PO number or your company…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="overflow-auto p-2">
                  {loading && (
                    <div className="px-3 py-8 text-center text-sm text-muted">Loading orders…</div>
                  )}
                  {loadError && !loading && (
                    <div className="px-3 py-8 text-center text-sm text-red-600">{loadError}</div>
                  )}
                  {!loading && !loadError && results.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-muted">
                      {orders.length === 0
                        ? "No open purchase orders yet."
                        : "No orders match your search."}{" "}
                      Use &quot;enter a PO number manually&quot; if you don&apos;t see yours.
                    </div>
                  )}
                  {!loading &&
                    results.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setViewing(o)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-ink hover:bg-brand-50"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="font-mono text-sm font-bold">{o.code}</span>
                          <span className="min-w-0 truncate text-sm text-slate-600">
                            {o.supplierName}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-blue-600">View →</span>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
