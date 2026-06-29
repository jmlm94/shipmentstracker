"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Payment = { id: string; url: string; label: string | null; amount: number | null; createdAt: string };

export function PoPayments({
  orderId,
  currency,
  payments,
}: {
  orderId: string;
  currency: string;
  payments: Payment[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function money(n: number) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  }

  async function upload() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", pending);
      if (label.trim()) fd.append("label", label.trim());
      if (amount.trim()) fd.append("amount", amount.trim());
      const res = await fetch(`/api/orders/${orderId}/payments`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      setPending(null);
      setLabel("");
      setAmount("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this payment confirmation?")) return;
    await fetch(`/api/orders/${orderId}/payments?paymentId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="card mb-6 p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
        💳 Payment confirmations
      </h2>
      <p className="mb-3 text-xs text-muted">
        Upload JPG/PNG screenshots of payments made for this order (deposit, balance, etc.).
      </p>

      {payments.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {payments.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl border border-slate-200">
              <a href={p.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.label || "Payment"} className="h-32 w-full object-cover" />
              </a>
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{p.label || "Payment"}</div>
                  <div className="text-[11px] text-muted">
                    {p.amount != null ? money(p.amount) + " · " : ""}
                    {p.createdAt.slice(0, 10)}
                  </div>
                </div>
                <button
                  onClick={() => remove(p.id)}
                  title="Remove"
                  className="shrink-0 text-slate-300 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          setPending(f);
          setError(null);
          e.target.value = "";
        }}
      />

      {pending ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 p-3">
          <div className="text-xs text-muted">
            📎 <span className="font-medium">{pending.name}</span>
          </div>
          <div>
            <label className="label">Label (optional)</label>
            <input
              className="input w-44"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Deposit 30%"
            />
          </div>
          <div>
            <label className="label">Amount (optional)</label>
            <input
              className="input w-28"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <button onClick={upload} disabled={busy} className="btn">
            {busy ? "Uploading…" : "Save payment"}
          </button>
          <button onClick={() => setPending(null)} className="btn-secondary" disabled={busy}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary">
          ＋ Upload payment screenshot
        </button>
      )}

      {error && <p className="err">{error}</p>}
    </section>
  );
}
