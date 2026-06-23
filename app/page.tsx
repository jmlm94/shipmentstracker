import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="card w-full p-10">
        <h1 className="text-2xl font-semibold">Shipments Tracker</h1>
        <p className="mt-3 text-sm text-muted">
          Suppliers submit every box they ship. The team tracks each box from
          dispatch to delivered and added in stock.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/submit" className="btn">
            Supplier: submit a shipment
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Team dashboard
          </Link>
        </div>
      </div>
      <p className="mt-6 text-xs text-muted">
        Send suppliers the link to <code>/submit</code> with each shipment.
      </p>
    </main>
  );
}
