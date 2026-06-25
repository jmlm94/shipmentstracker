import Link from "next/link";
import { SubmitForm } from "@/app/submit/SubmitForm";

export const dynamic = "force-dynamic";

export default function NewShipmentPage() {
  return (
    <div className="max-w-5xl">
      <Link href="/dashboard/shipments" className="text-sm text-muted hover:text-ink">
        ← Back to shipments
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-semibold">➕ Add a shipment</h1>
        <p className="mt-1 text-sm text-muted">
          Create a shipment on behalf of a supplier. It behaves exactly like a
          supplier submission and is tagged &quot;manually added&quot;.
        </p>
      </div>
      <SubmitForm internal />
    </div>
  );
}
