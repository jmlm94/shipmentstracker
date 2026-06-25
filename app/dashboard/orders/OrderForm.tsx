"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCombobox } from "@/components/ProductCombobox";
import type { CatalogProduct } from "@/lib/catalog";
import { money } from "@/lib/poStatus";

type Item = {
  productId: string;
  productName: string;
  productImage: string;
  sku: string;
  quantity: string;
  unitCost: string;
};

const emptyItem = (): Item => ({
  productId: "",
  productName: "",
  productImage: "",
  sku: "",
  quantity: "",
  unitCost: "",
});

export function OrderForm() {
  const router = useRouter();

  const today = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
      n.getDate()
    ).padStart(2, "0")}`;
  })();

  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [orderDate, setOrderDate] = useState(today);
  const [expectedDate, setExpectedDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [shippingCost, setShippingCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [otherCostLabel, setOtherCostLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setItem(i: number, patch: Partial<Item>) {
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function pick(i: number, p: CatalogProduct) {
    setItem(i, { productId: p.id, productName: p.title, productImage: p.image, sku: p.sku });
  }

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0),
    [items]
  );
  const total = subtotal + (Number(shippingCost) || 0) + (Number(otherCost) || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supplierName.trim()) return setError("Supplier name is required.");
    if (items.some((it) => !it.productId || !it.quantity))
      return setError("Each line needs a product and a quantity.");
    setSaving(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName,
        supplierEmail,
        supplierContact,
        orderDate,
        expectedDate: expectedDate || null,
        currency,
        shippingCost: shippingCost || 0,
        otherCost: otherCost || 0,
        otherCostLabel,
        notes,
        items: items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          productImage: it.productImage,
          sku: it.sku,
          quantity: it.quantity || 0,
          unitCost: it.unitCost || 0,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      router.push(`/dashboard/orders/${d.id}`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not create the order.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Supplier + dates */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Supplier</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Supplier name *</label>
            <input className="input" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          </div>
          <div>
            <label className="label">Supplier email</label>
            <input className="input" type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Contact / notes</label>
            <input className="input" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} placeholder="Contact person, WeChat, etc." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Order date</label>
              <input className="input" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Expected date</label>
              <input className="input" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      {/* Items */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Items ordered</h2>
          <div className="flex items-center gap-2 text-xs text-muted">
            Currency
            <input
              className="w-16 rounded border border-slate-300 px-1.5 py-1"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => {
            const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitCost) || 0);
            return (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[2fr_0.8fr_0.9fr_0.9fr_auto] sm:items-end"
              >
                <div>
                  <label className="label sm:hidden">Product</label>
                  <ProductCombobox
                    selected={{ productId: it.productId, productName: it.productName, productImage: it.productImage, productSku: it.sku }}
                    onSelect={(p) => pick(i, p)}
                  />
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input className="input" type="number" min={1} value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Unit cost</label>
                  <input className="input" type="number" min={0} step="0.01" value={it.unitCost} onChange={(e) => setItem(i, { unitCost: e.target.value })} />
                </div>
                <div>
                  <label className="label">Line total</label>
                  <div className="px-1 py-2 text-sm font-medium">{money(lineTotal, currency)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setItems((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)))}
                  disabled={items.length === 1}
                  className="pb-2 text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setItems((p) => [...p, emptyItem()])} className="btn-secondary mt-3">
          + Add item
        </button>
      </section>

      {/* Costs + notes */}
      <section className="card p-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <label className="label">Notes / terms</label>
            <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, incoterms, anything else" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium">{money(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted">Shipping cost</span>
              <input className="input w-32 text-right" type="number" min={0} step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <input className="input w-40" value={otherCostLabel} onChange={(e) => setOtherCostLabel(e.target.value)} placeholder="Other cost (label)" />
              <input className="input w-32 text-right" type="number" min={0} step="0.01" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{money(total, currency)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button className="btn" disabled={saving}>
          {saving ? "Creating…" : "Create purchase order"}
        </button>
      </div>
    </form>
  );
}
