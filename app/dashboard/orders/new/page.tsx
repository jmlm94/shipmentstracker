import Link from "next/link";
import { OrderForm } from "../OrderForm";

export const dynamic = "force-dynamic";

export default function NewOrderPage() {
  return (
    <div className="max-w-4xl">
      <Link href="/dashboard/orders" className="text-sm text-muted hover:text-ink">
        ← Back to orders
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-semibold">🧾 New purchase order</h1>
        <p className="mt-1 text-sm text-muted">
          Create the order before goods ship. It gets a PO number that suppliers
          locate on the intake form, so their shipment matches what you ordered.
        </p>
      </div>
      <OrderForm />
    </div>
  );
}
