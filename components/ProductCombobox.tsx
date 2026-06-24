"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? CATALOG.filter(
          (p) =>
            p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        )
      : CATALOG;
    return list.slice(0, 40);
  }, [query]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className={`flex w-full items-center gap-2 rounded-lg border bg-white px-2 py-1.5 text-left transition ${
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
                className="h-9 w-9 shrink-0 rounded object-cover"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {selected.productName}
              </span>
              {selected.productSku && (
                <span className="block truncate text-xs text-muted">
                  {selected.productSku}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-blue-600">Change</span>
          </>
        ) : (
          <span className="flex-1 py-1 text-sm text-slate-400">🔍 Search product…</span>
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <input
            autoFocus
            className="input m-2 w-[calc(100%-1rem)]"
            placeholder="Type a product name or SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-64 overflow-auto pb-1">
            {results.length === 0 && (
              <div className="px-3 py-3 text-sm text-muted">No matching products.</div>
            )}
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-slate-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{p.title}</span>
                  {p.sku && (
                    <span className="block truncate text-xs text-muted">{p.sku}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
