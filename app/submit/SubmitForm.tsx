"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCombobox } from "@/components/ProductCombobox";
import type { CatalogProduct } from "@/lib/catalog";

type Line = {
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  boxCount: string;
  unitsPerBox: string;
  weightPerBox: string;
  shippingMethod: string;
  carrier: string;
  trackingNumber: string;
};

const emptyLine = (): Line => ({
  productId: "",
  productName: "",
  productSku: "",
  productImage: "",
  boxCount: "",
  unitsPerBox: "",
  weightPerBox: "",
  shippingMethod: "",
  carrier: "",
  trackingNumber: "",
});

const CARRIERS = [
  ["UPS", "UPS"],
  ["FEDEX", "FedEx"],
  ["USPS", "USPS"],
  ["DHL", "DHL"],
  ["OTHER", "Others (Special Delivery)"],
];

export function SubmitForm() {
  const router = useRouter();

  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [shipmentDate, setShipmentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const err = (k: string) => errors[k];

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function selectProduct(i: number, p: CatalogProduct) {
    setLine(i, {
      productId: p.id,
      productName: p.title,
      productSku: p.sku,
      productImage: p.image,
    });
  }
  function addLine() {
    setLines((p) => [...p, emptyLine()]);
  }
  function duplicateLine(i: number) {
    setLines((p) => {
      const copy = { ...p[i], trackingNumber: "" };
      const next = [...p];
      next.splice(i + 1, 0, copy);
      return next;
    });
  }
  function removeLine(i: number) {
    setLines((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)));
  }
  function applyToAll(field: "shippingMethod" | "carrier", value: string) {
    setLines((p) => p.map((l) => ({ ...l, [field]: value })));
  }

  const totals = useMemo(() => {
    let boxes = 0;
    let units = 0;
    for (const l of lines) {
      const b = Number(l.boxCount) || 0;
      const u = Number(l.unitsPerBox) || 0;
      boxes += b;
      units += b * u;
    }
    return { boxes, units };
  }, [lines]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setErrors({});
    setSubmitting(true);

    const payload = {
      supplierName,
      supplierEmail,
      shipmentDate,
      notes,
      lines: lines.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        productSku: l.productSku,
        productImage: l.productImage,
        boxCount: l.boxCount,
        unitsPerBox: l.unitsPerBox,
        weightPerBox: l.weightPerBox,
        shippingMethod: l.shippingMethod,
        carrier: l.carrier,
        trackingNumber: l.trackingNumber,
      })),
    };

    const res = await fetch("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (res.ok) {
      const data = await res.json();
      router.push(
        `/submit/success?boxes=${data.boxes}&code=${encodeURIComponent(data.code)}&id=${data.id}`
      );
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.fieldErrors) {
      setErrors(data.fieldErrors);
      setBanner("Please fix the highlighted fields. 👇");
    } else {
      setBanner(data.error || "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {banner && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {banner}
        </div>
      )}

      {/* Shipment details */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          📦 Shipment details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Supplier name *</label>
            <input
              className="input"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Shenzhen Watch Co."
            />
            {err("supplierName") && <p className="err">{err("supplierName")}</p>}
          </div>
          <div>
            <label className="label">Email address *</label>
            <input
              className="input"
              type="email"
              value={supplierEmail}
              onChange={(e) => setSupplierEmail(e.target.value)}
              placeholder="you@supplier.com"
            />
            {err("supplierEmail") && <p className="err">{err("supplierEmail")}</p>}
          </div>
          <div>
            <label className="label">Shipment date *</label>
            <input
              className="input"
              type="date"
              value={shipmentDate}
              onChange={(e) => setShipmentDate(e.target.value)}
            />
            {err("shipmentDate") && <p className="err">{err("shipmentDate")}</p>}
          </div>
          <div>
            <label className="label">Notes</label>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the warehouse should know (optional)"
            />
          </div>
        </div>
      </section>

      {/* SKU lines */}
      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            🧾 Products in this shipment
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Apply to all:</span>
            <select
              className="rounded border border-slate-300 px-1.5 py-1"
              onChange={(e) => e.target.value && applyToAll("shippingMethod", e.target.value)}
              value=""
            >
              <option value="">Method…</option>
              <option value="AIR">Air ✈️</option>
              <option value="SEA">Sea 🚢</option>
            </select>
            <select
              className="rounded border border-slate-300 px-1.5 py-1"
              onChange={(e) => e.target.value && applyToAll("carrier", e.target.value)}
              value=""
            >
              <option value="">Carrier…</option>
              {CARRIERS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mb-3 text-xs text-muted">
          One row per SKU. For each SKU, all its boxes use a single shipping
          method and carrier. Tip: use <strong>Duplicate</strong> to copy a row
          when the numbers are similar. ✨
        </p>

        {/* Column headers (desktop) */}
        <div className="hidden grid-cols-[2.2fr_0.7fr_0.8fr_0.9fr_0.9fr_1.1fr_1.3fr_auto] gap-2 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
          <div>Product</div>
          <div># Boxes</div>
          <div>Units/box</div>
          <div>Wt/box (lbs)</div>
          <div>Method</div>
          <div>Carrier</div>
          <div>Tracking #</div>
          <div></div>
        </div>

        <div className="space-y-3 lg:space-y-1.5">
          {lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-[2.2fr_0.7fr_0.8fr_0.9fr_0.9fr_1.1fr_1.3fr_auto] lg:items-start lg:border-0 lg:p-1"
            >
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="label lg:hidden">Product *</label>
                <ProductCombobox
                  selected={{
                    productId: l.productId,
                    productName: l.productName,
                    productImage: l.productImage,
                    productSku: l.productSku,
                  }}
                  onSelect={(p) => selectProduct(i, p)}
                  error={err(`lines.${i}.productId`)}
                />
              </div>
              <div>
                <label className="label lg:hidden"># Boxes *</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={l.boxCount}
                  onChange={(e) => setLine(i, { boxCount: e.target.value })}
                />
                {err(`lines.${i}.boxCount`) && <p className="err">{err(`lines.${i}.boxCount`)}</p>}
              </div>
              <div>
                <label className="label lg:hidden">Units/box *</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={l.unitsPerBox}
                  onChange={(e) => setLine(i, { unitsPerBox: e.target.value })}
                />
                {err(`lines.${i}.unitsPerBox`) && (
                  <p className="err">{err(`lines.${i}.unitsPerBox`)}</p>
                )}
              </div>
              <div>
                <label className="label lg:hidden">Weight/box (lbs) *</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.weightPerBox}
                  onChange={(e) => setLine(i, { weightPerBox: e.target.value })}
                />
                {err(`lines.${i}.weightPerBox`) && (
                  <p className="err">{err(`lines.${i}.weightPerBox`)}</p>
                )}
              </div>
              <div>
                <label className="label lg:hidden">Method *</label>
                <select
                  className="input"
                  value={l.shippingMethod}
                  onChange={(e) => setLine(i, { shippingMethod: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="AIR">Air ✈️</option>
                  <option value="SEA">Sea 🚢</option>
                </select>
                {err(`lines.${i}.shippingMethod`) && (
                  <p className="err">{err(`lines.${i}.shippingMethod`)}</p>
                )}
              </div>
              <div>
                <label className="label lg:hidden">Carrier *</label>
                <select
                  className="input"
                  value={l.carrier}
                  onChange={(e) => setLine(i, { carrier: e.target.value })}
                >
                  <option value="">—</option>
                  {CARRIERS.map(([v, lab]) => (
                    <option key={v} value={v}>
                      {lab}
                    </option>
                  ))}
                </select>
                {err(`lines.${i}.carrier`) && <p className="err">{err(`lines.${i}.carrier`)}</p>}
              </div>
              <div>
                <label className="label lg:hidden">Tracking # *</label>
                <input
                  className="input"
                  value={l.trackingNumber}
                  onChange={(e) => setLine(i, { trackingNumber: e.target.value })}
                />
                {err(`lines.${i}.trackingNumber`) && (
                  <p className="err">{err(`lines.${i}.trackingNumber`)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 lg:flex-col lg:gap-1 lg:pt-1.5">
                <button
                  type="button"
                  onClick={() => duplicateLine(i)}
                  title="Duplicate row"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  title="Remove row"
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {err("lines") && <p className="err mt-2">{err("lines")}</p>}

        <div className="mt-3">
          <button type="button" onClick={addLine} className="btn-secondary">
            + Add product line
          </button>
        </div>
      </section>

      {/* Submit */}
      <div className="flex flex-wrap items-center justify-end gap-4">
        <span className="text-sm text-muted">
          📦 {totals.boxes} box{totals.boxes === 1 ? "" : "es"} · {totals.units} units total
        </span>
        <button className="btn" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit shipment 🚀"}
        </button>
      </div>
    </form>
  );
}
