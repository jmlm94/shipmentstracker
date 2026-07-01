"use client";

import { useState } from "react";
import { toast } from "@/components/Toaster";

// Moves data-URI images stored in the database to Vercel Blob, batch by batch.
// Keeps clicking itself until nothing is left.
export function MigrateImagesButton() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setProgress(null);
    try {
      let total = 0;
      for (let i = 0; i < 40; i++) {
        const res = await fetch("/api/admin/migrate-images", { method: "POST" });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast(d.error || "Migration failed part-way — progress was saved, try again.", "error");
          return;
        }
        total += d.migrated;
        setProgress(`${total} moved, ${d.remaining} left…`);
        if (d.remaining === 0) {
          toast(
            total === 0
              ? "Nothing to migrate — all images are already on Blob storage."
              : `Done — moved ${total} image${total === 1 ? "" : "s"} to Blob storage.`,
            "success"
          );
          return;
        }
      }
      toast("Stopped after many batches — click again to continue.", "info");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <button type="button" onClick={run} disabled={busy} className="btn-secondary">
      {busy ? progress || "Migrating…" : "🗄️ Move images to Blob storage"}
    </button>
  );
}
