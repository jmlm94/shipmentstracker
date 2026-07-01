import { prisma } from "@/lib/prisma";
import { ALL_CARRIERS, ALL_STATUSES, CARRIER_LABEL, STATUS_META } from "@/lib/status";
import { MigrateImagesButton } from "@/components/MigrateImagesButton";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const suppliers = await prisma.shipment.findMany({
    distinct: ["supplierName"],
    select: { supplierName: true },
    orderBy: { supplierName: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">⬇️ Export</h1>
        <p className="mt-1 text-sm text-muted">
          Download all shipment data as a CSV. Optionally filter by date, supplier,
          carrier, or status first.
        </p>
      </div>

      {/* GET form submits straight to the CSV endpoint, which downloads the file. */}
      <form action="/api/export" method="GET" className="card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Shipped from</label>
            <input className="input" type="date" name="from" />
          </div>
          <div>
            <label className="label">Shipped to</label>
            <input className="input" type="date" name="to" />
          </div>
          <div>
            <label className="label">Supplier</label>
            <select className="input" name="supplier" defaultValue="">
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.supplierName} value={s.supplierName}>
                  {s.supplierName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Carrier</label>
            <select className="input" name="carrier" defaultValue="">
              <option value="">All carriers</option>
              {ALL_CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {CARRIER_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Status</label>
            <select className="input" name="status" defaultValue="">
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn" type="submit">
          ⬇️ Download CSV
        </button>
      </form>

      <p className="mt-4 text-xs text-muted">
        Columns include shipment code, PO number, box code, supplier, dates,
        carrier, method, product/SKU, tracking number, units, weight (lbs &amp;
        kg), status, discrepancy, received-by, and carrier status.
      </p>

      {/* Accounting exports */}
      <section className="card mt-8 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          💰 Purchase orders (accounting)
        </h2>
        <p className="mt-1 text-sm text-muted">
          Financial exports for bookkeeping: totals, payments, balance due, and
          landed cost per unit.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/api/export?type=orders" className="btn">
            ⬇️ Orders summary CSV
          </a>
          <a href="/api/export?type=order-items" className="btn-secondary">
            ⬇️ Line items CSV (landed costs)
          </a>
        </div>
      </section>

      {/* Maintenance */}
      <section className="card mt-6 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          🛠 Maintenance
        </h2>
        <p className="mt-1 text-sm text-muted">
          If images were uploaded before Blob storage was configured, they live
          inside the database and slow pages down. This moves them to Vercel
          Blob (requires <code className="rounded bg-slate-100 px-1">BLOB_READ_WRITE_TOKEN</code>).
        </p>
        <div className="mt-4">
          <MigrateImagesButton />
        </div>
      </section>
    </div>
  );
}
