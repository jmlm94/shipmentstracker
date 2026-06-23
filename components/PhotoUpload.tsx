"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Photo = { id: string; url: string };

export function PhotoUpload({
  boxId,
  photos,
}: {
  boxId: string;
  photos: Photo[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("photos", f));
    const res = await fetch(`/api/boxes/${boxId}/photos`, { method: "POST", body: fd });
    setUploading(false);
    e.target.value = "";
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Upload failed");
    }
  }

  async function remove(photoId: string) {
    await fetch(`/api/boxes/${boxId}/photos?photoId=${photoId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((p) => (
          <div key={p.id} className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href={p.url} target="_blank" rel="noreferrer">
              <img
                src={p.url}
                alt="Box photo"
                className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
              />
            </a>
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white group-hover:flex"
              aria-label="Delete photo"
            >
              ×
            </button>
          </div>
        ))}
        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-muted hover:border-slate-400">
          {uploading ? "…" : "+ Photo"}
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={onPick}
            disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
