"use client";

import { useState } from "react";

export function TestEasyPostButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tracking/easypost/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.ok) setMsg(`✅ Connected (${data.mode} mode).`);
      else setMsg(`⚠️ ${data.error || "Not connected."}`);
    } catch {
      setMsg("⚠️ Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
      >
        {busy ? "Checking…" : "🚚 Test EasyPost"}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
