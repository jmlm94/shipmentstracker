"use client";

import { useEffect } from "react";

// Last-resort boundary for errors thrown in the root layout itself. Must render
// its own <html>/<body> because it replaces the whole document.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error", error.digest, error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "#F4F5F6",
          color: "#0B0D11",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h1 style={{ fontSize: 20, marginTop: 12 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#5b6470", marginTop: 8 }}>
            The app hit an unexpected error. Please try again.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: 12, color: "#9aa3ad", marginTop: 8 }}>
              Ref: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              marginTop: 20,
              background: "#0B0D11",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
