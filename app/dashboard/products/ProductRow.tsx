"use client";

import { useRef, useState } from "react";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`/api/products/${id}/image`, { method: "POST", body: fd });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Could not upload the image.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      alert("Could not save. Try again.");
    }
  }

  function cancel() {
    setValue(name);
    setEditing(false);
  }

  async function remove() {
    if (!confirm(`Remove "${name}" from the catalog?`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadImage(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title={image ? "Change image" : "Upload image"}
        className="group relative h-11 w-11 shrink-0 overflow-hidden rounded border border-slate-200"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-base text-slate-400">
            📷
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-medium text-transparent transition group-hover:bg-black/50 group-hover:text-white">
          {uploading ? "…" : image ? "Change" : "Add"}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              className="input py-1.5 text-sm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
            />
            <button
              onClick={save}
              disabled={busy}
              className="shrink-0 rounded bg-orange-600 px-2 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={cancel} className="shrink-0 px-1.5 py-1 text-xs text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
            <button
              onClick={() => setEditing(true)}
              title="Edit name"
              className="shrink-0 text-slate-400 hover:text-orange-600"
            >
              ✏️
            </button>
            <button
              onClick={remove}
              title="Remove"
              className="shrink-0 text-slate-300 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        )}
        {sku && !editing && <div className="truncate text-[11px] text-muted">{sku}</div>}
      </div>
    </div>
  );
}
