"use client";

import { useEffect, useMemo, useState } from "react";
import { CATALOG, type CatalogProduct } from "@/lib/catalog";

type Selected = {
  productId: string;
  productName: string;
  productImage?: string;
  productSku?: string;
};

// Load the catalog once and share across all combobox instances.
let catalogCache: Promise<CatalogProduct[]> | null = null;
function loadCatalog(): Promise<CatalogProduct[]> {
  if (!catalogCache) {
    catalogCache = fetch("/api/public/catalog")
      .then((r) => r.json())
      .then((d) => (d.products?.length ? d.products : CATALOG))
      .catch(() => CATALOG);
  }
  return catalogCache;
}

export function ProductCombobox({
  selected,
  onSelect,
  error,
  allowedIds,
  allowedNote,
}: {
  selected: Selected;
  onSelect: (p: CatalogProduct) => void;
  error?: string;
  // When set, only these product ids are offered (the products on the chosen
  // purchase order). Falls back to the full catalog if none of them resolve —
  // an unfillable picker would brick the form.
  allowedIds?: string[];
  allowedNote?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogProduct[]>(CATALOG);

  useEffect(() => {
    loadCatalog().then(setCatalog);
  }, []);

  const base = useMemo(() => {
    if (!allowedIds || allowedIds.length === 0) return catalog;
    const restricted = catalog.filter((p) => allowedIds.includes(p.id));
    return restricted.length > 0 ? restricted : catalog;
  }, [catalog, allowedIds]);
  const restricted = base.length !== catalog.length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) => p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [query, base]);

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
          <span className="flex-1 py-0.5 text-sm text-slate-400">🔍 Search for a product…</span>
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
              {restricted && (
                <div className="mb-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  {allowedNote || "Showing only the products on your purchase order."}
                </div>
              )}
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
                    className="flex flex-col rounded-lg border border-slate-200 p-2 text-left transition hover:border-ink hover:bg-brand-50"
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt=""
                        className="mb-1.5 h-24 w-full rounded-md object-cover sm:h-28"
                      />
                    ) : (
                      <div className="mb-1.5 flex h-24 w-full items-center justify-center rounded-md bg-slate-100 text-2xl sm:h-28">
                        📦
                      </div>
                    )}
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
