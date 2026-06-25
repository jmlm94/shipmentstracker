"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteShipmentButton({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (
      !confirm(
        `Delete shipment ${code} and all of its boxes? This can't be undone.`
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/shipments/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/shipments");
      router.refresh();
    } else {
      setBusy(false);
      alert("Could not delete. Please try again.");
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "Deleting…" : "🗑️ Delete shipment"}
    </button>
  );
}
