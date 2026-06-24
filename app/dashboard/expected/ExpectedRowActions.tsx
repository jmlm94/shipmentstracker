"use client";

import { useRouter } from "next/navigation";

export function ExpectedRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();

  async function setStatus(s: string) {
    await fetch(`/api/expected/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    router.refresh();
  }
  async function remove() {
    await fetch(`/api/expected/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {status !== "ARRIVED" && (
        <button onClick={() => setStatus("ARRIVED")} className="font-medium text-emerald-600 hover:underline">
          ✅ Mark arrived
        </button>
      )}
      {status !== "CANCELLED" && (
        <button onClick={() => setStatus("CANCELLED")} className="font-medium text-amber-600 hover:underline">
          Cancel
        </button>
      )}
      <button onClick={remove} className="font-medium text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}
