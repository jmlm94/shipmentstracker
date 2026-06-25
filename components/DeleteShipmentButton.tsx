"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteShipmentButton({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    const res = await fetch(`/api/shipments/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push(`/dashboard/shipments?deleted=${encodeURIComponent(code)}`);
      router.refresh();
    } else {
      setBusy(false);
      alert("Could not delete. Please try again.");
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setConfirmText("");
          setOpen(true);
        }}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        🗑️ Delete shipment
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Delete shipment {code}?</h2>
            <p className="mt-2 text-sm text-muted">
              This will <strong>permanently remove all box records, tracking numbers,
              photos, and status history</strong> for this shipment. This cannot be
              undone.
            </p>
            <label className="label mt-4">
              Type <span className="font-mono font-semibold text-ink">{code}</span> to confirm
            </label>
            <input
              className="input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={code}
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="text-sm font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={busy || confirmText.trim() !== code}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
              >
                {busy ? "Deleting…" : "Yes, delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
