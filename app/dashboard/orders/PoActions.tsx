"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function PoActions({
  id,
  code,
  status,
  hasShipments,
}: {
  id: string;
  code: string;
  status: string;
  hasShipments: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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

  async function syncReceived() {
    setBusy(true);
    await fetch(`/api/orders/${id}/sync-received`, { method: "POST" });
    setBusy(false);
    router.refresh();
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
        <button onClick={syncReceived} disabled={busy} className="btn-secondary">
          🔄 Sync received
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
