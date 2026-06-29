"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCombobox } from "@/components/ProductCombobox";
import { OrderPicker } from "@/components/OrderPicker";
import type { CatalogProduct } from "@/lib/catalog";

const KG_TO_LBS = 2.20462;

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
  trackingMode: "BATCH" | "PER_BOX";
  trackingNumber: string;
  boxTracking: string[];
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
  trackingMode: "BATCH",
  trackingNumber: "",
  boxTracking: [],
});

const CARRIERS = [
  ["UPS", "UPS"],
  ["FEDEX", "FedEx"],
  ["USPS", "USPS"],
  ["DHL", "DHL"],
  ["OTHER", "Others (Special Delivery)"],
];

const METHOD_DISP: Record<string, string> = { AIR: "Air ✈️", SEA: "Sea 🚢" };
const CARRIER_DISP: Record<string, string> = Object.fromEntries(CARRIERS);

// Per-box tracking table: one row per box, with the line's units / weight /
// method / carrier copied down and an editable tracking number each.
function PerBoxTracking({
  line,
  onChange,
  indexErr,
}: {
  line: Line;
  onChange: (k: number, v: string) => void;
  indexErr: (k: number) => string | undefined;
}) {
  const n = Number(line.boxCount) || 0;
  if (n <= 0) {
    return (
      <p className="text-xs text-muted">Enter the number of boxes above to list them.</p>
    );
  }
  const method = METHOD_DISP[line.shippingMethod] || "—";
  const carrier = CARRIER_DISP[line.carrier] || "—";
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="hidden bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:grid sm:grid-cols-[3rem_1fr_1.6fr]">
        <div>Box</div>
        <div>Details (copied)</div>
        <div>Tracking # *</div>
      </div>
      <div className="max-h-80 divide-y divide-slate-100 overflow-auto">
        {Array.from({ length: n }, (_, k) => (
          <div
            key={k}
            className="grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-[3rem_1fr_1.6fr] sm:items-center"
          >
            <div className="text-xs font-semibold text-slate-500">#{k + 1}</div>
            <div className="text-xs text-muted">
              {line.unitsPerBox || "?"} units · {line.weightPerBox || "?"} lbs · {method} ·{" "}
              {carrier}
            </div>
            <div>
              <input
                className="input py-1.5"
                placeholder={`Tracking # for box ${k + 1}`}
                value={line.boxTracking?.[k] || ""}
                onChange={(e) => onChange(k, e.target.value)}
              />
              {indexErr(k) && <p className="err">{indexErr(k)}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SubmitForm({ internal = false }: { internal?: boolean }) {
  const router = useRouter();

  const [supplierName, setSupplierName] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [supplierEmail, setSupplierEmail] = useState("");
  const [shipmentDate, setShipmentDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // Default the shipment date to today — most submissions are on the ship day.
  useEffect(() => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    setShipmentDate((d) => d || iso);
  }, []);

  const err = (k: string) => errors[k];
  function clearErr(k: string) {
    setErrors((e) => {
      if (!e[k]) return e;
      const next = { ...e };
      delete next[k];
      return next;
    });
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    Object.keys(patch).forEach((f) => clearErr(`lines.${i}.${f}`));
  }
  function selectProduct(i: number, p: CatalogProduct) {
    setLine(i, {
      productId: p.id,
      productName: p.title,
      productSku: p.sku,
      productImage: p.image,
    });
  }
  function setBoxTracking(i: number, k: number, value: string) {
    setLines((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l;
        const arr = [...(l.boxTracking || [])];
        while (arr.length <= k) arr.push("");
        arr[k] = value;
        return { ...l, boxTracking: arr };
      })
    );
    clearErr(`lines.${i}.boxTracking.${k}`);
  }
  function addLine() {
    setLines((p) => [...p, emptyLine()]);
  }
  function duplicateLine(i: number) {
    setLines((p) => {
      const copy = { ...p[i], trackingNumber: "", boxTracking: [] };
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

  // Client-side validation with specific, inline messages.
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!supplierName.trim()) e.supplierName = "Supplier name is required";
    if (!poNumber.trim()) e.poNumber = "PO number is required";
    if (!supplierEmail.trim()) e.supplierEmail = "Email is required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(supplierEmail.trim()))
      e.supplierEmail = "Please enter a valid email";
    if (!shipmentDate) e.shipmentDate = "Shipment date is required";

    lines.forEach((l, i) => {
      if (!l.productId) e[`lines.${i}.productId`] = "Pick a product";
      if (!l.boxCount || Number(l.boxCount) < 1) e[`lines.${i}.boxCount`] = "Must be at least 1";
      if (!l.unitsPerBox || Number(l.unitsPerBox) < 1)
        e[`lines.${i}.unitsPerBox`] = "Must be at least 1";
      if (!l.weightPerBox || Number(l.weightPerBox) <= 0)
        e[`lines.${i}.weightPerBox`] = "Must be more than 0";
      if (!l.shippingMethod) e[`lines.${i}.shippingMethod`] = "Pick Air or Sea";
      if (!l.carrier) e[`lines.${i}.carrier`] = "Select a carrier";
      if (l.trackingMode === "PER_BOX") {
        const n = Number(l.boxCount) || 0;
        for (let k = 0; k < n; k++) {
          if (!(l.boxTracking?.[k] || "").trim())
            e[`lines.${i}.boxTracking.${k}`] = "Tracking # required";
        }
      } else if (!l.trackingNumber.trim()) {
        e[`lines.${i}.trackingNumber`] = "Tracking number is required";
      }
    });
    return e;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      const n = Object.keys(clientErrors).length;
      setBanner(`${n} field${n === 1 ? "" : "s"} need your attention. 👇`);
      setTimeout(() => {
        document.querySelector(".err")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }

    setErrors({});
    setSubmitting(true);

    // Weights are entered in the supplier's chosen unit; store in lbs.
    const toLbs = (v: string) =>
      weightUnit === "kg" ? (Number(v) * KG_TO_LBS).toFixed(2) : v;

    const payload = {
      supplierName,
      poNumber,
      purchaseOrderId,
      supplierEmail,
      shipmentDate,
      expectedDeliveryDate: expectedDeliveryDate || null,
      notes,
      manuallyAdded: internal,
      lines: lines.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        productSku: l.productSku,
        productImage: l.productImage,
        boxCount: l.boxCount,
        unitsPerBox: l.unitsPerBox,
        weightPerBox: toLbs(l.weightPerBox),
        shippingMethod: l.shippingMethod,
        carrier: l.carrier,
        trackingMode: l.trackingMode,
        trackingNumber: l.trackingNumber,
        boxTracking: l.boxTracking,
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
      if (internal) {
        router.push(`/dashboard/${data.id}`);
      } else {
        router.push(
          `/submit/success?boxes=${data.boxes}&code=${encodeURIComponent(data.code)}&id=${data.id}`
        );
      }
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
              onChange={(e) => {
                setSupplierName(e.target.value);
                clearErr("supplierName");
              }}
              placeholder="e.g. Shenzhen Watch Co."
            />
            {err("supplierName") && <p className="err">{err("supplierName")}</p>}
          </div>
          <div>
            <label className="label">Purchase order *</label>
            <OrderPicker
              poNumber={poNumber}
              onChange={(code, id) => {
                setPoNumber(code);
                setPurchaseOrderId(id);
                clearErr("poNumber");
              }}
              error={err("poNumber")}
            />
          </div>
          <div>
            <label className="label">Email address *</label>
            <input
              className="input"
              type="email"
              value={supplierEmail}
              onChange={(e) => {
                setSupplierEmail(e.target.value);
                clearErr("supplierEmail");
              }}
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
              onChange={(e) => {
                setShipmentDate(e.target.value);
                clearErr("shipmentDate");
              }}
            />
            {err("shipmentDate") && <p className="err">{err("shipmentDate")}</p>}
          </div>
          <div>
            <label className="label">Expected delivery date</label>
            <input
              className="input"
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted">
              Optional — if blank, we estimate 45 days (Air) / 60 days (Sea).
            </p>
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
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">Set all lines:</span>
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
            <span className="ml-2 inline-flex overflow-hidden rounded border border-slate-300">
              {(["kg", "lbs"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setWeightUnit(u)}
                  className={`px-2 py-1 ${
                    weightUnit === u ? "bg-ink text-white" : "bg-white text-slate-600"
                  }`}
                >
                  {u}
                </button>
              ))}
            </span>
          </div>
        </div>

        <p className="mb-3 text-xs text-muted">
          One row per SKU. For each SKU, all its boxes use a single shipping
          method and carrier. Tip: use <strong>Duplicate</strong> to copy a row
          when the numbers are similar. ✨
        </p>

        <div className="space-y-4">
          {lines.map((l, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  SKU line {i + 1}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => duplicateLine(i)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    📋 Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="label">Product *</label>
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

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label"># Boxes *</label>
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
                  <label className="label">Units / box *</label>
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
                  <label className="label">Weight / box ({weightUnit}) *</label>
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
                  <label className="label">Method *</label>
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
                  <label className="label">Carrier *</label>
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
              </div>

              {/* Tracking numbers */}
              <div className="mt-4 border-t border-slate-200 pt-3">
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tracking number *
                  </span>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name={`tm-${i}`}
                      checked={l.trackingMode === "BATCH"}
                      onChange={() => setLine(i, { trackingMode: "BATCH" })}
                    />
                    One per batch
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name={`tm-${i}`}
                      checked={l.trackingMode === "PER_BOX"}
                      onChange={() => setLine(i, { trackingMode: "PER_BOX" })}
                    />
                    One per box
                  </label>
                </div>

                {l.trackingMode === "BATCH" ? (
                  <div className="sm:max-w-sm">
                    <input
                      className="input"
                      placeholder="Tracking number for all boxes"
                      value={l.trackingNumber}
                      onChange={(e) => setLine(i, { trackingNumber: e.target.value })}
                    />
                    {err(`lines.${i}.trackingNumber`) && (
                      <p className="err">{err(`lines.${i}.trackingNumber`)}</p>
                    )}
                  </div>
                ) : (
                  <PerBoxTracking
                    line={l}
                    indexErr={(k) => err(`lines.${i}.boxTracking.${k}`)}
                    onChange={(k, v) => setBoxTracking(i, k, v)}
                  />
                )}
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
