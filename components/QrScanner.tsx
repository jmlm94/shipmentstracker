"use client";

import { useEffect, useRef, useState } from "react";

// Camera-based QR scanner for box stickers. Dynamically imports html5-qrcode
// (browser-only) so it never touches SSR. Degrades gracefully — if the camera
// can't start, the user just keeps using manual entry.
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerId = useRef(`qr-${Math.floor(Math.random() * 1e9)}`).current;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded: string) => {
            onScan(decoded);
            stop();
          },
          () => {}
        );
      } catch (e) {
        if (!cancelled) {
          setError("Couldn't start the camera. Type the box code instead.");
          setActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function stop() {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      s.stop()
        .then(() => s.clear())
        .catch(() => {});
    }
    setActive(false);
  }

  return (
    <div>
      {!active ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setActive(true);
          }}
          className="btn-secondary w-full"
        >
          📷 Scan box QR with camera
        </button>
      ) : (
        <div className="rounded-lg border border-slate-200 p-2">
          <div id={containerId} className="mx-auto w-full max-w-xs overflow-hidden rounded-lg" />
          <button type="button" onClick={stop} className="btn-secondary mt-2 w-full">
            Stop camera
          </button>
        </div>
      )}
      {error && <p className="err mt-1">{error}</p>}
    </div>
  );
}
