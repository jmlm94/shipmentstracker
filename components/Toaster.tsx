"use client";

import { useEffect, useState } from "react";

// Minimal toast system, no dependencies. Call toast("Saved!") anywhere on the
// client; <Toaster /> (mounted once in the root layout) renders the stack.

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; message: string; kind: ToastKind };

const EVENT = "app:toast";

export function toast(message: string, kind: ToastKind = "info") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, kind } }));
}

const KIND_STYLE: Record<ToastKind, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  error: "border-red-300 bg-red-50 text-red-900",
  info: "border-slate-300 bg-white text-ink",
};

const KIND_ICON: Record<ToastKind, string> = {
  success: "✅",
  error: "⚠️",
  info: "ℹ️",
};

let nextId = 1;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const { message, kind } = (e as CustomEvent).detail as { message: string; kind: ToastKind };
      const id = nextId++;
      setItems((cur) => [...cur, { id, message, kind }]);
      // Errors linger a bit longer so they can actually be read.
      const ttl = kind === "error" ? 7000 : 4000;
      setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), ttl);
    }
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${KIND_STYLE[t.kind]}`}
        >
          <span className="shrink-0">{KIND_ICON[t.kind]}</span>
          <span className="min-w-0">{t.message}</span>
          <button
            onClick={() => setItems((cur) => cur.filter((x) => x.id !== t.id))}
            className="ml-1 shrink-0 opacity-50 hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
