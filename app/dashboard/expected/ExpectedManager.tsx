"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCombobox } from "@/components/ProductCombobox";
import type { CatalogProduct } from "@/lib/catalog";

type Item = {
  productId: string;
  productName: string;
  productImage: string;
  productSku: string;
  expectedUnits: string;
};

const emptyItem = (): Item => ({
  productId: "",
  productName: "",
  productImage: "",
  productSku: "",
  expectedUnits: "",
});

export function ExpectedManager() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setItem(i: number, patch: Partial<Item>) {
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function pick(i: number, p: CatalogProduct) {
    setItem(i, { productId: p.id, productName: p.title, productImage: p.image, productSku: p.sku });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/expected", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName,
        expectedDate: expectedDate || null,
        note,
        items: items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          productImage: it.productImage,
          expectedUnits: it.expectedUnits === "" ? 0 : Number(it.expectedUnits),
        })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSupplierName("");
      setExpectedDate("");
      setNote("");
      setItems([emptyItem()]);
      setOpen(false);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save");
    }
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        ➕ Log expected arrival
      </button>
    );
  }

  return (
    <form onSubmit={save} className="card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        New expected arrival
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Supplier *</label>
          <input className="input" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </div>
        <div>
          <label className="label">Expected date</label>
          <input
            className="input"
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Note</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_0.8fr_auto] sm:items-center">
            <ProductCombobox
              selected={{
                productId: it.productId,
                productName: it.productName,
                productImage: it.productImage,
                productSku: it.productSku,
              }}
              onSelect={(p) => pick(i, p)}
            />
            <input
              className="input"
              type="number"
              min={1}
              placeholder="Expected units"
              value={it.expectedUnits}
              onChange={(e) => setItem(i, { expectedUnits: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setItems((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)))}
              disabled={items.length === 1}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {error && <p className="err mt-2">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => setItems((p) => [...p, emptyItem()])} className="btn-secondary">
          + Add product
        </button>
        <button className="btn" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
