import { SubmitForm } from "./SubmitForm";

export const metadata = { title: "Submit a shipment · Shipments Tracker" };

export default function SubmitPage() {
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Carbinox";
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:px-6">
          <span className="text-lg font-bold tracking-tight">📦 {company}</span>
          <span className="text-sm text-orange-100">· Supplier Shipment Intake</span>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Submit a shipment 🚚</h1>
          <p className="mt-2 text-sm text-muted">
            Fill in the shipment details, then add <strong>one row per product (SKU)</strong>{" "}
            you&apos;re shipping. For each SKU, tell us how many boxes, units per box,
            weight, the shipping method and carrier, and the tracking number.
            After you submit, you&apos;ll get a <strong>PDF of box labels</strong> to
            print and stick on each box. 🏷️
          </p>
        </header>
        <SubmitForm />
      </main>
    </div>
  );
}
