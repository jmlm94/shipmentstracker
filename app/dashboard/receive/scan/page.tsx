import Link from "next/link";
import { ReceiveScanner } from "../ReceiveScanner";

export const metadata = { title: "Scan a box · Shipments Tracker" };

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/dashboard/receive" className="text-sm text-muted hover:text-ink">
        ← Back to receiving
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-semibold">Scan a box</h1>
        <p className="mt-1 text-sm text-muted">
          Scan or type a box&apos;s tracking number to find it, then update its status,
          weight received, and condition. Built for phones at Station #1. Receiving a box
          updates its purchase order automatically.
        </p>
      </div>
      <ReceiveScanner />
    </div>
  );
}
