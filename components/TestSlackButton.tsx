"use client";

import { useState } from "react";

export function TestSlackButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/slack/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.ok) setMsg("✅ Sent — check your Slack channel.");
      else setMsg(`⚠️ ${data.error || "Couldn't send."}`);
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
        {busy ? "Sending…" : "💬 Test Slack"}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
