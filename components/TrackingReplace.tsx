"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";

function parseList(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

// Bulk-replace the tracking numbers on a shipment's undelivered boxes.
// Numbers are assigned in box order; delivered boxes keep theirs.
export function TrackingReplace({
  shipmentId,
  code,
  pendingBoxes,
}: {
  shipmentId: string;
  code: string;
  pendingBoxes: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const numbers = useMemo(() => parseList(text), [text]);
  const dupes = numbers.length !== new Set(numbers).size;
  const ready = numbers.length === pendingBoxes && !dupes;

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/tracking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "Couldn't replace tracking numbers.", "error");
        return;
      }
      toast(`Replaced tracking on ${d.updated} box${d.updated === 1 ? "" : "es"}. ✅`, "success");
      setOpen(false);
      setText("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (pendingBoxes === 0) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        🔖 Replace tracking #s
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/50 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="mt-4 flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:mt-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-base font-semibold">Replace tracking numbers — {code}</h3>
              <p className="mt-1 text-xs text-muted">
                Paste one number per box (one per line, or separated by commas/spaces). They are
                assigned in box order to the{" "}
                <strong>
                  {pendingBoxes} box{pendingBoxes === 1 ? "" : "es"} awaiting delivery
                </strong>
                . Boxes already delivered keep their current numbers.
              </p>
            </div>
            <div className="overflow-auto p-4">
              <textarea
                autoFocus
                className="input h-56 w-full font-mono text-sm"
                placeholder={"1Z999AA10123456784\n1Z999AA10123456785\n…"}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p
                className={`mt-2 text-sm ${
                  ready ? "text-emerald-700" : numbers.length === 0 ? "text-muted" : "text-amber-700"
                }`}
              >
                {dupes
                  ? "⚠️ The list contains duplicate numbers."
                  : `${numbers.length} number${numbers.length === 1 ? "" : "s"} pasted · ${pendingBoxes} needed${
                      ready ? " — ready ✓" : ""
                    }`}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={!ready || busy} className="btn">
                {busy ? "Replacing…" : `Replace ${pendingBoxes} number${pendingBoxes === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
