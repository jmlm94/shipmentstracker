"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductRow({
  id,
  name,
  sku,
  image,
}: {
  id: string;
  name: string;
  sku: string;
  image: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setState("idle");
      return;
    }
    setState("saving");
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 1500);
    } else {
      setState("error");
    }
  }

  async function remove() {
    if (!confirm(`Remove "${name}" from the catalog?`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-11 w-11 shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
          —
        </div>
      )}
      <div className="min-w-0 flex-1">
        <input
          className="input py-1.5 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        {sku && <div className="mt-0.5 truncate text-[11px] text-muted">{sku}</div>}
      </div>
      <div className="flex w-16 shrink-0 items-center justify-end gap-2 text-xs">
        {state === "saving" && <span className="text-muted">…</span>}
        {state === "saved" && <span className="text-emerald-600">✓ Saved</span>}
        {state === "error" && <span className="text-red-600">error</span>}
        {state === "idle" && (
          <button onClick={remove} className="text-red-500 hover:underline" title="Remove">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
