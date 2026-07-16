"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";

export function PoActions({
  id,
  code,
  status,
  hasShipments,
  hasUndoableSync = false,
}: {
  id: string;
  code: string;
  status: string;
  hasShipments: boolean;
  hasUndoableSync?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState(false);

  async function setStatus(s: string) {
    setBusy(true);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    setBusy(false);
    router.refresh();
  }

  // Query EasyPost live for this order's active tracking numbers.
  async function updateTracking() {
    setTracking(true);
    try {
      const res = await fetch(`/api/orders/${id}/refresh-tracking`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "Couldn't update tracking.", "error");
        return;
      }
      const bits = [`Checked ${d.checked} box${d.checked === 1 ? "" : "es"}`];
      if (d.changed > 0) bits.push(`${d.changed} status update${d.changed === 1 ? "" : "s"}`);
      if (d.healed > 0) bits.push(`${d.healed} delivery credit${d.healed === 1 ? "" : "s"} applied`);
      toast(
        d.checked === 0
          ? "No boxes are in transit on this order."
          : `${bits.join(" · ")}${d.changed === 0 && d.healed === 0 ? " — no news from the carriers." : ""}`,
        d.changed > 0 || d.healed > 0 ? "success" : "info"
      );
      router.refresh();
    } finally {
      setTracking(false);
    }
  }

  async function undoSync() {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${id}/undo-sync`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "Couldn't undo.", "error");
        return;
      }
      toast(`Restored ${d.restored} item count${d.restored === 1 ? "" : "s"}. ✅`, "success");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${code}? Linked shipments are kept but unlinked.`)) return;
    setBusy(true);
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    router.push("/dashboard/orders");
    router.refresh();
  }

  if (status === "DRAFT") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/dashboard/orders/${id}/edit`} className="btn-secondary">
          ✏️ Edit
        </Link>
        <button onClick={() => setStatus("OPEN")} disabled={busy} className="btn">
          📤 Finalize order
        </button>
        <button onClick={remove} disabled={busy} className="text-red-600 hover:underline">
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Link href={`/dashboard/orders/${id}/edit`} className="btn-secondary">
        ✏️ Edit
      </Link>
      {hasShipments && (
        <button onClick={updateTracking} disabled={tracking || busy} className="btn-secondary">
          {tracking ? "📡 Checking carriers…" : "📡 Update tracking"}
        </button>
      )}
      {hasUndoableSync && (
        <button onClick={undoSync} disabled={busy} className="btn-secondary">
          ↩️ Undo sync
        </button>
      )}
      {status === "RECEIVED" ? (
        <button onClick={() => setStatus("OPEN")} disabled={busy} className="btn-secondary">
          ↩️ Unmark received
        </button>
      ) : (
        <button onClick={() => setStatus("RECEIVED")} disabled={busy} className="btn-secondary">
          ✅ Mark received
        </button>
      )}
      {status === "CANCELLED" ? (
        <button onClick={() => setStatus("OPEN")} disabled={busy} className="text-blue-600 hover:underline">
          Reopen
        </button>
      ) : (
        <button onClick={() => setStatus("CANCELLED")} disabled={busy} className="text-amber-600 hover:underline">
          Cancel
        </button>
      )}
      <button onClick={remove} disabled={busy} className="text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
