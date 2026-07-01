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
  receivedQty: string;
  hint?: string; // raw name from an imported invoice when no catalog match was found
};

type CostRow = { label: string; amount: string };
type OtherRow = { label: string; amount: string; sign: "+" | "-" };

export type OrderFormInitial = {
  id?: string; // present = edit an existing PO; absent = create-mode prefill (e.g. from an invoice)
  supplierName: string;
  supplierEmail: string;
  supplierContact: string;
  orderDate: string; // yyyy-mm-dd
  expectedDate: string; // yyyy-mm-dd or ""
  currency: string;
  notes: string;
  items: Item[];
  shippingCosts: CostRow[];
  otherCosts: OtherRow[];
};

const emptyItem = (): Item => ({
  productId: "",
  productName: "",
  productImage: "",
  sku: "",
  quantity: "",
  unitCost: "",
  receivedQty: "",
});

export function OrderForm({ initial }: { initial?: OrderFormInitial }) {
  const router = useRouter();
  const editing = !!initial?.id;

  const today = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
      n.getDate()
    ).padStart(2, "0")}`;
  })();

  const [supplierName, setSupplierName] = useState(initial?.supplierName ?? "");
  const [supplierEmail, setSupplierEmail] = useState(initial?.supplierEmail ?? "");
  const [supplierContact, setSupplierContact] = useState(initial?.supplierContact ?? "");
  const [orderDate, setOrderDate] = useState(initial?.orderDate ?? today);
  const [expectedDate, setExpectedDate] = useState(initial?.expectedDate ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<Item[]>(initial?.items?.length ? initial.items : [emptyItem()]);
  const [shippingCosts, setShippingCosts] = useState<CostRow[]>(initial?.shippingCosts ?? []);
  const [otherCosts, setOtherCosts] = useState<OtherRow[]>(initial?.otherCosts ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set after a failed submit so cost rows missing a description show red.
  const [flagMissingLabels, setFlagMissingLabels] = useState(false);

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
  const shippingTotal = useMemo(
    () => shippingCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0),
    [shippingCosts]
  );
  const otherTotal = useMemo(
    () =>
      otherCosts.reduce(
        (s, c) => s + (c.sign === "-" ? -1 : 1) * (Number(c.amount) || 0),
        0
      ),
    [otherCosts]
  );
  const total = subtotal + shippingTotal + otherTotal;

  function buildCosts() {
    const costs: { kind: "SHIPPING" | "OTHER"; label: string; amount: number }[] = [];
    shippingCosts.forEach((c) => {
      const amount = Number(c.amount) || 0;
      if (amount === 0 && !c.label.trim()) return;
      costs.push({ kind: "SHIPPING", label: c.label.trim() || "Shipping", amount });
    });
    otherCosts.forEach((c) => {
      const mag = Number(c.amount) || 0;
      if (mag === 0 && !c.label.trim()) return;
      // Label is validated as required before submit — no silent defaults, so
      // every charge/credit says where it came from.
      costs.push({
        kind: "OTHER",
        label: c.label.trim(),
        amount: (c.sign === "-" ? -1 : 1) * mag,
      });
    });
    return costs;
  }

  // Other costs / credits with an amount but no description ("Credit $500"
  // with no context is useless three months later).
  function missingCostLabels() {
    return otherCosts.some((c) => (Number(c.amount) || 0) !== 0 && !c.label.trim());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFlagMissingLabels(false);
    if (!supplierName.trim()) return setError("Supplier name is required.");
    if (items.some((it) => !it.productId || !it.quantity))
      return setError("Each line needs a product and a quantity.");
    if (missingCostLabels()) {
      setFlagMissingLabels(true);
      return setError(
        "Describe each other cost / credit (highlighted below) so you'll know where it came from."
      );
    }

    setSaving(true);
    const body = {
      supplierName,
      supplierEmail,
      supplierContact,
      orderDate,
      expectedDate: expectedDate || null,
      currency,
      notes,
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        productImage: it.productImage,
        sku: it.sku,
        quantity: it.quantity || 0,
        unitCost: it.unitCost || 0,
        receivedQty: it.receivedQty || 0,
      })),
      costs: buildCosts(),
    };

    const res = await fetch(editing ? `/api/orders/${initial!.id}` : "/api/orders", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      const id = editing ? initial!.id : d.id;
      router.push(`/dashboard/orders/${id}`);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save the order.");
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
                className={`grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:items-end ${
                  editing
                    ? "sm:grid-cols-[2fr_0.7fr_0.8fr_0.8fr_0.9fr_auto]"
                    : "sm:grid-cols-[2fr_0.8fr_0.9fr_0.9fr_auto]"
                }`}
              >
                <div>
                  <label className="label sm:hidden">Product</label>
                  <ProductCombobox
                    selected={{ productId: it.productId, productName: it.productName, productImage: it.productImage, productSku: it.sku }}
                    onSelect={(p) => pick(i, p)}
                  />
                  {it.hint && !it.productId && (
                    <p className="mt-1 text-xs text-amber-600">
                      📄 From invoice: “{it.hint}” — pick the matching product
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input className="input" type="number" min={1} value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Unit cost</label>
                  <input className="input" type="number" min={0} step="0.01" value={it.unitCost} onChange={(e) => setItem(i, { unitCost: e.target.value })} />
                </div>
                {editing && (
                  <div>
                    <label className="label">Received</label>
                    <input className="input" type="number" min={0} value={it.receivedQty} onChange={(e) => setItem(i, { receivedQty: e.target.value })} placeholder="0" />
                  </div>
                )}
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

      {/* Costs */}
      <section className="card p-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Cost editors */}
          <div className="space-y-5">
            {/* Shipping costs */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">🚚 Shipping costs</h3>
                <button
                  type="button"
                  onClick={() => setShippingCosts((p) => [...p, { label: "", amount: "" }])}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  + Add shipping cost
                </button>
              </div>
              <p className="mb-2 text-xs text-muted">
                Add one per shipment when an order ships in several batches.
              </p>
              {shippingCosts.length === 0 && (
                <p className="text-xs text-slate-400">No shipping costs yet.</p>
              )}
              <div className="space-y-2">
                {shippingCosts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Description (e.g. Sea freight — DHL)"
                      value={c.label}
                      onChange={(e) =>
                        setShippingCosts((p) => p.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                      }
                    />
                    <input
                      className="input w-28 text-right"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={c.amount}
                      onChange={(e) =>
                        setShippingCosts((p) => p.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShippingCosts((p) => p.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-600 hover:underline"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Other costs & credits */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">➕➖ Other costs &amp; credits</h3>
                <button
                  type="button"
                  onClick={() => setOtherCosts((p) => [...p, { label: "", amount: "", sign: "+" }])}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  + Add cost / credit
                </button>
              </div>
              <p className="mb-2 text-xs text-muted">
                Use <strong>+</strong> for extra charges (duties, samples) and{" "}
                <strong>−</strong> for credits / discounts. Describe each one.
              </p>
              {otherCosts.length === 0 && (
                <p className="text-xs text-slate-400">No other costs or credits yet.</p>
              )}
              <div className="space-y-2">
                {otherCosts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="inline-flex overflow-hidden rounded border border-slate-300">
                      {(["+", "-"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setOtherCosts((p) => p.map((x, idx) => (idx === i ? { ...x, sign: s } : x)))
                          }
                          className={`px-2.5 py-1.5 text-sm font-semibold ${
                            c.sign === s
                              ? s === "-"
                                ? "bg-emerald-600 text-white"
                                : "bg-ink text-white"
                              : "bg-white text-slate-500"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </span>
                    <input
                      className={`input flex-1 ${
                        flagMissingLabels && (Number(c.amount) || 0) !== 0 && !c.label.trim()
                          ? "border-red-400 ring-1 ring-red-300"
                          : ""
                      }`}
                      placeholder={c.sign === "-" ? "Where's this credit from? (e.g. defect refund PO-0002)" : "What's this cost? (e.g. customs duty)"}
                      value={c.label}
                      onChange={(e) =>
                        setOtherCosts((p) => p.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                      }
                    />
                    <input
                      className="input w-28 text-right"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={c.amount}
                      onChange={(e) =>
                        setOtherCosts((p) => p.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setOtherCosts((p) => p.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-600 hover:underline"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <label className="label">Notes / terms</label>
                <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, incoterms, anything else" />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 lg:border-l lg:border-slate-100 lg:pl-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium">{money(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Shipping ({shippingCosts.length})</span>
              <span>{money(shippingTotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Other / credits ({otherCosts.length})</span>
              <span className={otherTotal < 0 ? "text-emerald-600" : ""}>{money(otherTotal, currency)}</span>
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
          {saving ? "Saving…" : editing ? "Save changes" : "Create draft order"}
        </button>
      </div>
    </form>
  );
}
