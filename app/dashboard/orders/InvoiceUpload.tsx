"use client";

import { useRef, useState } from "react";
import type { OrderFormInitial } from "./OrderForm";

export function InvoiceUpload({ onParsed }: { onParsed: (draft: OrderFormInitial) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/orders/parse-invoice", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't read that invoice.");
        return;
      }
      onParsed(data.draft as OrderFormInitial);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mb-6 border-dashed p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">📄 Import from an invoice</h2>
          <p className="mt-0.5 text-sm text-muted">
            Upload a supplier invoice or quote (PDF or photo) and we&apos;ll fill in the
            order for you. You can edit everything before saving.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-secondary shrink-0"
        >
          {busy ? "Reading…" : "Upload invoice"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {fileName && !error && (
        <p className="mt-2 text-xs text-muted">
          {busy ? "Reading " : "Imported "}
          <span className="font-medium">{fileName}</span>
          {busy ? "… this can take a few seconds." : " — review the fields below."}
        </p>
      )}
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
