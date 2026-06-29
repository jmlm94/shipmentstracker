"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's overdue right now?",
  "Summarize today's shipments",
  "Which suppliers have the most delays?",
  "What's the status of PO-0001?",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Couldn't reach the assistant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white/70 p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-4xl">💬</div>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Ask anything about your shipments, purchase orders, suppliers, and delivery
              statuses. I read your live data to answer.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-ink hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-ink text-white"
                    : "border border-slate-200 bg-white text-ink"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-muted">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-slate-400 [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-slate-400 [animation-delay:0.4s]" />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          className="input"
          placeholder="Ask about your shipments, orders, suppliers…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button className="btn shrink-0" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
