"use client";

import { useRef, useState } from "react";

type Note = {
  id: string;
  text: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  createdAt: string;
};

export function PoNotes({ orderId, notes }: { orderId: string; notes: Note[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Note[]>(notes);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!text.trim() && !file) {
      setError("Write a note or attach a file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      if (text.trim()) fd.append("text", text.trim());
      if (file) fd.append("file", file);
      const res = await fetch(`/api/orders/${orderId}/notes`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save the note.");
        return;
      }
      setItems((prev) => [data.note as Note, ...prev]);
      setText("");
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this note?")) return;
    setItems((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/orders/${orderId}/notes?noteId=${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <section className="card mb-6 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">📝 Notes &amp; files</h2>

      {/* Composer */}
      <div className="rounded-xl border border-slate-200 p-3">
        <textarea
          className="input"
          rows={2}
          placeholder="Write a note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError(null);
            }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary">
            📎 Attach file
          </button>
          {file && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              {file.name}
              <button type="button" onClick={() => setFile(null)} className="text-red-500 hover:underline">
                ✕
              </button>
            </span>
          )}
          <button type="button" onClick={add} disabled={busy} className="btn ml-auto">
            {busy ? "Saving…" : "Add note"}
          </button>
        </div>
        {error && <p className="err">{error}</p>}
      </div>

      {/* Feed */}
      {items.length > 0 && (
        <div className="mt-4 space-y-3">
          {items.map((n) => {
            const isImage = (n.fileType || "").startsWith("image/");
            return (
              <div key={n.id} className="rounded-xl border border-slate-100 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted" suppressHydrationWarning>
                    {new Date(n.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <button onClick={() => remove(n.id)} title="Delete" className="text-slate-300 hover:text-red-500">
                    ✕
                  </button>
                </div>
                {n.text && <p className="whitespace-pre-wrap text-sm">{n.text}</p>}
                {n.fileUrl && (
                  <div className="mt-2">
                    {isImage ? (
                      <a href={n.fileUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={n.fileUrl} alt={n.fileName || ""} className="max-h-48 rounded-lg border border-slate-200" />
                      </a>
                    ) : (
                      <a
                        href={n.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={n.fileName || undefined}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-slate-300"
                      >
                        📄 <span className="font-medium">{n.fileName || "Attachment"}</span>
                        <span className="text-xs text-blue-600">Open</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
