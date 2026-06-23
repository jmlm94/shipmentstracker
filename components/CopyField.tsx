"use client";

import { useState } from "react";

export function CopyField({
  value,
  multiline = false,
}: {
  value: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <div className="flex items-start gap-2">
      {multiline ? (
        <textarea readOnly className="input font-mono text-xs" rows={5} value={value} />
      ) : (
        <input readOnly className="input font-mono text-sm" value={value} />
      )}
      <button type="button" className="btn shrink-0" onClick={copy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
