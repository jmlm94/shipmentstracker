import { ReceiveScanner } from "./ReceiveScanner";

export const metadata = { title: "Receive · Shipments Tracker" };

export default function ReceivePage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Receive boxes</h1>
        <p className="mt-1 text-sm text-muted">
          Scan or type a box's tracking number to find it, then update its
          status, weight received, and condition. Built for phones at Station #1.
        </p>
      </div>
      <ReceiveScanner />
    </div>
  );
}
