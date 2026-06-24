"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CsvImport() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setMsg(null);
    setBusy(true);
    const text = await file.text();
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: text,
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(
        `Imported ${data.imported} products. Columns used → name: "${data.mapped?.name}"` +
          (data.mapped?.sku ? `, sku: "${data.mapped.sku}"` : ", sku: (none)") +
          (data.mapped?.image ? `, image: "${data.mapped.image}"` : ", image: (none)")
      );
      router.refresh();
    } else {
      setError(data.error || "Import failed");
    }
  }

  async function clearAll() {
    if (!confirm("Clear the imported catalog and fall back to the built-in list?")) return;
    setBusy(true);
    await fetch("/api/products", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
        Import from Sortly (CSV)
      </h2>
      <p className="mb-3 text-sm text-muted">
        Export your inventory from Sortly to CSV, then upload it here. The product
        list the suppliers see will match it exactly. Re-upload anytime to refresh.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn cursor-pointer">
          {busy ? "Working…" : "⬆️ Upload Sortly CSV"}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={busy} />
        </label>
        <button onClick={clearAll} disabled={busy} className="text-sm text-muted hover:text-ink">
          Clear imported list
        </button>
      </div>
      {msg && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✅ {msg}
        </p>
      )}
      {error && <p className="err mt-3">{error}</p>}
    </div>
  );
}
