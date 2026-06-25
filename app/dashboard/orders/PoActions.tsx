"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PoActions({ id, code, status }: { id: string; code: string; status: string }) {
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

  async function remove() {
    if (!confirm(`Delete ${code}? Linked shipments are kept but unlinked.`)) return;
    setBusy(true);
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    router.push("/dashboard/orders");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {status !== "RECEIVED" && (
        <button onClick={() => setStatus("RECEIVED")} disabled={busy} className="btn-secondary">
          ✅ Mark received
        </button>
      )}
      {status === "CANCELLED" ? (
        <button onClick={() => setStatus("OPEN")} disabled={busy} className="btn-secondary">
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
