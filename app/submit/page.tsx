import SubmitForm from "./SubmitForm";

export const metadata = { title: "Submit a shipment · Shipments Tracker" };

export default function SubmitPage() {
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Warehouse";
  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <span className="font-semibold">{company}</span>
          <span className="ml-2 text-sm text-muted">· Shipment intake</span>
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Submit a shipment</h1>
          <p className="mt-2 text-sm text-muted">
            Fill in the shipment details, then add <strong>one row per box</strong>{" "}
            you are shipping. Every box needs its own tracking number, SKU, unit
            count and weight. Please be exact — this is checked on arrival.
          </p>
        </header>
        <SubmitForm />
      </main>
    </div>
  );
}
