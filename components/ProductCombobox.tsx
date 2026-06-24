"use client";

import { useMemo, useState } from "react";
import { CATALOG, type CatalogProduct } from "@/lib/catalog";

type Selected = {
  productId: string;
  productName: string;
  productImage?: string;
  productSku?: string;
};

export function ProductCombobox({
  selected,
  onSelect,
  error,
}: {
  selected: Selected;
  onSelect: (p: CatalogProduct) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter(
      (p) => p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setQuery("");
        }}
        className={`flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left transition ${
          error ? "border-red-400" : "border-slate-300 hover:border-slate-400"
        }`}
      >
        {selected.productId ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {selected.productImage && (
              <img
                src={selected.productImage}
                alt=""
                className="h-10 w-10 shrink-0 rounded object-cover"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{selected.productName}</span>
              {selected.productSku && (
                <span className="block truncate text-xs text-muted">{selected.productSku}</span>
              )}
            </span>
            <span className="shrink-0 text-xs font-medium text-blue-600">Change</span>
          </>
        ) : (
          <span className="flex-1 py-0.5 text-sm text-slate-400">🔍 Tap to choose a product…</span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="mt-4 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:mt-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 p-3">
              <input
                autoFocus
                className="input flex-1"
                placeholder="Search by product name or SKU…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary shrink-0">
                Close
              </button>
            </div>
            <div className="overflow-auto p-3">
              <div className="mb-2 text-xs text-muted">
                {results.length} product{results.length === 1 ? "" : "s"}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {results.length === 0 && (
                  <div className="col-span-full py-8 text-center text-sm text-muted">
                    No matching products.
                  </div>
                )}
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelect(p);
                      setOpen(false);
                    }}
                    className="flex flex-col rounded-lg border border-slate-200 p-2 text-left transition hover:border-orange-400 hover:bg-orange-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt=""
                      className="mb-1.5 h-24 w-full rounded-md object-cover sm:h-28"
                    />
                    <span className="line-clamp-2 text-xs font-medium leading-tight">{p.title}</span>
                    {p.sku && (
                      <span className="mt-0.5 truncate text-[11px] text-muted">{p.sku}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="err">{error}</p>}
    </>
  );
}
