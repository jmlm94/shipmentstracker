"use client";

import { useEffect } from "react";

// Route-level error boundary. Replaces Next.js's raw "Application error" screen
// with something the team can act on, and logs the digest so it can be matched
// to a server log line.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", error.digest, error);
  }, [error]);

  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <div className="text-4xl">⚠️</div>
      <h1 className="mt-3 text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        This screen hit an error while loading. It&apos;s usually temporary — try again. If it
        keeps happening, let the team know with the reference below.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</p>
      )}
      <div className="mt-5 flex justify-center gap-2">
        <button onClick={() => reset()} className="btn">
          Try again
        </button>
        <a href="/dashboard" className="btn-secondary">
          Back to overview
        </a>
      </div>
    </div>
  );
}
