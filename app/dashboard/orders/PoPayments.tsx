"use client";

import { useRef, useState } from "react";

type Payment = {
  id: string;
  url: string;
  label: string | null;
  amount: number | null;
  paidAt: string; // YYYY-MM-DD
};

export function PoPayments({
  orderId,
  currency,
  payments,
}: {
  orderId: string;
  currency: string;
  payments: Payment[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Payment[]>(payments);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function money(n: number) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  }

  const total = items.reduce((s, p) => s + (p.amount || 0), 0);

  async function uploadFiles(files: File[]) {
    setError(null);
    const valid = files.filter((f) => f.type === "image/jpeg" || f.type === "image/png");
    if (valid.length !== files.length) setError("Only JPG/PNG screenshots are supported — others were skipped.");
    setUploading(valid.length);
    for (const file of valid) {
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch(`/api/orders/${orderId}/payments`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.payment) {
          setItems((prev) => [data.payment as Payment, ...prev]);
        } else {
          setError(data.error || "An upload failed.");
        }
      } catch {
        setError("An upload failed.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function patch(id: string, field: "label" | "amount" | "paidAt", value: string) {
    setItems((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, [field]: field === "amount" ? (value === "" ? null : Number(value)) : value }
          : p
      )
    );
    fetch(`/api/orders/${orderId}/payments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: id, [field]: value }),
    }).catch(() => {});
  }

  async function remove(id: string) {
    if (!confirm("Remove this payment confirmation?")) return;
    setItems((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/orders/${orderId}/payments?paymentId=${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <section className="card mb-6 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          💳 Payment confirmations
        </h2>
        {total > 0 && (
          <span className="text-sm text-muted">
            Total paid: <span className="font-semibold text-emerald-600">{money(total)}</span>
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-muted">
        Upload one or more JPG/PNG screenshots — we read the amount automatically. Set the
        payment date with the calendar (defaults to today). Everything stays editable.
      </p>

      {(items.length > 0 || uploading > 0) && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: uploading }).map((_, i) => (
            <div
              key={`up-${i}`}
              className="flex h-44 animate-pulse items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-muted"
            >
              📤 Reading screenshot…
            </div>
          ))}
          {items.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200">
              <a href={p.url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.label || "Payment"} className="h-32 w-full bg-slate-50 object-cover" />
              </a>
              <div className="space-y-2 p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    className="input py-1.5 text-sm font-semibold"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Amount"
                    defaultValue={p.amount ?? ""}
                    onBlur={(e) => patch(p.id, "amount", e.target.value)}
                  />
                  <button
                    onClick={() => remove(p.id)}
                    title="Remove"
                    className="shrink-0 text-slate-300 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
                <input
                  className="input py-1.5 text-sm"
                  type="date"
                  defaultValue={p.paidAt}
                  onChange={(e) => e.target.value && patch(p.id, "paidAt", e.target.value)}
                />
                <input
                  className="input py-1.5 text-sm"
                  placeholder="Label (optional, e.g. Deposit 30%)"
                  defaultValue={p.label ?? ""}
                  onBlur={(e) => patch(p.id, "label", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) uploadFiles(files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading > 0}
        className="btn-secondary"
      >
        {uploading > 0 ? "Reading…" : "＋ Upload payment screenshots"}
      </button>

      {error && <p className="err">{error}</p>}
    </section>
  );
}
