"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CatalogProduct = { sku: string; name: string; unitsPerBox: number | null };

type BoxRow = {
  productId: string;
  productName: string;
  trackingNumber: string;
  unitsPerBox: string;
  weightOfBox: string;
  manual: boolean; // true when entering a SKU not in the catalog
};

const emptyBox = (): BoxRow => ({
  productId: "",
  productName: "",
  trackingNumber: "",
  unitsPerBox: "",
  weightOfBox: "",
  manual: false,
});

// Field-level error map keyed by "path.to.field" e.g. "boxes.0.trackingNumber".
type ErrorMap = Record<string, string>;

export default function SubmitForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ErrorMap>({});

  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [shipmentDate, setShipmentDate] = useState("");
  const [carrier, setCarrier] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [boxes, setBoxes] = useState<BoxRow[]>([emptyBox()]);

  // Catalog of products suppliers can pick from (loaded from the dashboard's SKUs).
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  useEffect(() => {
    fetch("/api/public/products")
      .then((r) => r.json())
      .then((d) => setCatalog(d.products || []))
      .catch(() => setCatalog([]));
  }, []);

  // When a supplier picks a product, fill SKU + name (+ default units if known).
  function selectProduct(i: number, sku: string) {
    if (sku === "__other__") {
      setBoxes((prev) =>
        prev.map((b, idx) =>
          idx === i ? { ...b, manual: true, productId: "", productName: "" } : b
        )
      );
      return;
    }
    const p = catalog.find((c) => c.sku === sku);
    setBoxes((prev) =>
      prev.map((b, idx) =>
        idx === i
          ? {
              ...b,
              manual: false,
              productId: p ? p.sku : "",
              productName: p ? p.name : "",
              unitsPerBox: p?.unitsPerBox ? String(p.unitsPerBox) : b.unitsPerBox,
            }
          : b
      )
    );
  }

  const totalUnits = useMemo(
    () => boxes.reduce((sum, b) => sum + (parseInt(b.unitsPerBox) || 0), 0),
    [boxes]
  );

  function err(key: string) {
    return errors[key];
  }

  function updateBox(i: number, field: keyof BoxRow, value: string) {
    setBoxes((prev) => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  }

  function addBox() {
    setBoxes((prev) => [...prev, emptyBox()]);
  }

  function addBoxes(n: number) {
    setBoxes((prev) => [...prev, ...Array.from({ length: n }, emptyBox)]);
  }

  function removeBox(i: number) {
    setBoxes((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    setSubmitting(true);

    const payload = {
      supplierName,
      supplierEmail,
      shipmentDate,
      carrier,
      shippingMethod,
      notes,
      boxesTotal: boxes.length,
      boxes: boxes.map((b) => ({
        productId: b.productId,
        productName: b.productName,
        trackingNumber: b.trackingNumber,
        unitsPerBox: b.unitsPerBox,
        weightOfBox: b.weightOfBox,
      })),
    };

    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors(data.fieldErrors as ErrorMap);
          setFormError("Please fix the highlighted fields.");
        } else {
          setFormError(data.error || "Something went wrong. Please try again.");
        }
        setSubmitting(false);
        return;
      }
      router.push(`/submit/success?boxes=${data.boxes}&code=${encodeURIComponent(data.code)}`);
    } catch {
      setFormError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Shipment details */}
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Shipment details
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
            <label className="label">Supplier email</label>
            <input
              className="input"
              type="email"
              value={supplierEmail}
              onChange={(e) => setSupplierEmail(e.target.value)}
              placeholder="optional"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Carrier *</label>
              <select
                className="input"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              >
                <option value="">Select…</option>
                <option value="FEDEX">FedEx</option>
                <option value="DHL">DHL</option>
                <option value="UPS">UPS</option>
              </select>
              {err("carrier") && <p className="err">{err("carrier")}</p>}
            </div>
            <div>
              <label className="label">Method *</label>
              <select
                className="input"
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
              >
                <option value="">Select…</option>
                <option value="AIR">Air</option>
                <option value="SEA">Sea</option>
              </select>
              {err("shippingMethod") && <p className="err">{err("shippingMethod")}</p>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the warehouse should know (optional)"
          />
        </div>
      </section>

      {/* Boxes */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Boxes ({boxes.length}) · {totalUnits} units total
          </h2>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={addBox}>
              + Add box
            </button>
            <button type="button" className="btn-secondary" onClick={() => addBoxes(10)}>
              + Add 10
            </button>
          </div>
        </div>

        {err("boxes") && <p className="err mb-2">{err("boxes")}</p>}

        <div className="space-y-3">
          {boxes.map((box, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Box #{i + 1}</span>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                  onClick={() => removeBox(i)}
                  disabled={boxes.length === 1}
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="label">Product *</label>
                  {catalog.length > 0 && (
                    <select
                      className="input"
                      value={box.manual ? "__other__" : box.productId}
                      onChange={(e) => selectProduct(i, e.target.value)}
                    >
                      <option value="">Select a product…</option>
                      {catalog.map((c) => (
                        <option key={c.sku} value={c.sku}>
                          {c.name} ({c.sku})
                        </option>
                      ))}
                      <option value="__other__">Other / not listed…</option>
                    </select>
                  )}
                  {/* Manual SKU + name: shown when catalog is empty or "Other" chosen. */}
                  {(catalog.length === 0 || box.manual) && (
                    <div className={`grid grid-cols-2 gap-2 ${catalog.length > 0 ? "mt-2" : ""}`}>
                      <input
                        className="input"
                        value={box.productId}
                        onChange={(e) => updateBox(i, "productId", e.target.value)}
                        placeholder="SKU"
                      />
                      <input
                        className="input"
                        value={box.productName}
                        onChange={(e) => updateBox(i, "productName", e.target.value)}
                        placeholder="Product name"
                      />
                    </div>
                  )}
                  {err(`boxes.${i}.productId`) && (
                    <p className="err">{err(`boxes.${i}.productId`)}</p>
                  )}
                </div>
                <div>
                  <label className="label">Tracking number *</label>
                  <input
                    className="input"
                    value={box.trackingNumber}
                    onChange={(e) => updateBox(i, "trackingNumber", e.target.value)}
                  />
                  {err(`boxes.${i}.trackingNumber`) && (
                    <p className="err">{err(`boxes.${i}.trackingNumber`)}</p>
                  )}
                </div>
                <div>
                  <label className="label">Units in box *</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={box.unitsPerBox}
                    onChange={(e) => updateBox(i, "unitsPerBox", e.target.value)}
                  />
                  {err(`boxes.${i}.unitsPerBox`) && (
                    <p className="err">{err(`boxes.${i}.unitsPerBox`)}</p>
                  )}
                </div>
                <div>
                  <label className="label">Weight (lbs) *</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={box.weightOfBox}
                    onChange={(e) => updateBox(i, "weightOfBox", e.target.value)}
                  />
                  {err(`boxes.${i}.weightOfBox`) && (
                    <p className="err">{err(`boxes.${i}.weightOfBox`)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {formError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-muted">
          {boxes.length} box{boxes.length === 1 ? "" : "es"} · {totalUnits} units
        </span>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit shipment"}
        </button>
      </div>
    </form>
  );
}
