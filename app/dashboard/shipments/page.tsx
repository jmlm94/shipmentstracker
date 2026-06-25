import Link from "next/link";
import { BoxStatus, Carrier, Prisma, ShippingMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ALL_CARRIERS, ALL_STATUSES, CARRIER_LABEL, METHOD_LABEL, STATUS_META } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import { daysSince } from "@/lib/eta";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    supplier?: string;
    carrier?: string;
    method?: string;
    q?: string;
    discrepancy?: string;
    deleted?: string;
  };
}) {
  const statuses = (searchParams.status || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is BoxStatus => ALL_STATUSES.includes(s as BoxStatus));

  const carrier = ALL_CARRIERS.includes(searchParams.carrier as Carrier)
    ? (searchParams.carrier as Carrier)
    : undefined;
  const method = ["AIR", "SEA"].includes(searchParams.method || "")
    ? (searchParams.method as ShippingMethod)
    : undefined;
  const supplier = searchParams.supplier?.trim() || undefined;
  const q = (searchParams.q || "").trim();
  const discrepancy = searchParams.discrepancy === "1";

  // Box-level filter — restricts which boxes are shown on each shipment card.
  // Carrier and method now live on each box (per SKU line).
  const boxWhere: Prisma.BoxWhereInput = {};
  if (statuses.length) boxWhere.status = { in: statuses };
  if (discrepancy) boxWhere.hasDiscrepancy = true;
  if (carrier) boxWhere.carrier = carrier;
  if (method) boxWhere.shippingMethod = method;
  const hasBoxFilter = Object.keys(boxWhere).length > 0;

  const shipmentWhere: Prisma.ShipmentWhereInput = {};
  if (supplier) shipmentWhere.supplierName = supplier;
  if (hasBoxFilter) shipmentWhere.boxes = { some: boxWhere };
  // Free-text search across shipment code, supplier, and box tracking/SKU/name.
  if (q) {
    shipmentWhere.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { poNumber: { contains: q, mode: "insensitive" } },
      { supplierName: { contains: q, mode: "insensitive" } },
      {
        boxes: {
          some: {
            OR: [
              { trackingNumber: { contains: q, mode: "insensitive" } },
              { productId: { contains: q, mode: "insensitive" } },
              { productName: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  const [shipments, supplierGroups] = await Promise.all([
    prisma.shipment.findMany({
      where: shipmentWhere,
      orderBy: { createdAt: "desc" },
      include: {
        // When filtering by box criteria, only show the matching boxes.
        boxes: hasBoxFilter
          ? { where: boxWhere, orderBy: { boxNumber: "asc" } }
          : { orderBy: { boxNumber: "asc" } },
      },
    }),
    prisma.shipment.findMany({
      distinct: ["supplierName"],
      select: { supplierName: true },
      orderBy: { supplierName: "asc" },
    }),
  ]);

  const totalBoxes = shipments.reduce((s, sh) => s + sh.boxes.length, 0);
  const anyFilter = statuses.length || carrier || method || supplier || q || discrepancy;
  const now = new Date();

  return (
    <div>
      {searchParams.deleted && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✅ Shipment {searchParams.deleted} has been deleted.
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Shipments</h1>
            <Link href="/dashboard/shipments/new" className="btn">
              ＋ Add shipment
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted">
            {shipments.length} shipments · {totalBoxes} boxes
            {hasBoxFilter ? " matching" : ""}
          </p>
        </div>
        {anyFilter ? (
          <Link href="/dashboard/shipments" className="btn-secondary">
            Clear filters
          </Link>
        ) : null}
      </div>

      {/* Filter bar */}
      <form className="card mb-5 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="label">Search</label>
          <input
            className="input"
            name="q"
            defaultValue={q}
            placeholder="Code, PO #, supplier, tracking, SKU…"
          />
        </div>
        <div>
          <label className="label">Supplier</label>
          <select className="input" name="supplier" defaultValue={supplier || ""}>
            <option value="">All</option>
            {supplierGroups.map((s) => (
              <option key={s.supplierName} value={s.supplierName}>
                {s.supplierName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Carrier</label>
          <select className="input" name="carrier" defaultValue={carrier || ""}>
            <option value="">All</option>
            {ALL_CARRIERS.map((c) => (
              <option key={c} value={c}>
                {CARRIER_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" name="status" defaultValue={statuses[0] || ""}>
            <option value="">All</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-4 sm:col-span-2 lg:col-span-5">
          <div className="w-40">
            <label className="label">Method</label>
            <select className="input" name="method" defaultValue={method || ""}>
              <option value="">All</option>
              <option value="AIR">Air</option>
              <option value="SEA">Sea</option>
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              name="discrepancy"
              value="1"
              defaultChecked={discrepancy}
              className="h-4 w-4 rounded border-slate-300"
            />
            Discrepancies only
          </label>
          <button className="btn ml-auto" type="submit">
            Apply filters
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="space-y-4">
        {shipments.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">
            No shipments match these filters.
          </div>
        )}
        {shipments.map((shipment) => {
          const units = shipment.boxes.reduce((sum, b) => sum + b.unitsPerBox, 0);
          const carriers = Array.from(new Set(shipment.boxes.map((b) => CARRIER_LABEL[b.carrier])));
          const methods = Array.from(
            new Set(shipment.boxes.map((b) => METHOD_LABEL[b.shippingMethod]))
          );
          const thumbs = Array.from(
            new Set(shipment.boxes.map((b) => b.productImage).filter(Boolean))
          ).slice(0, 6) as string[];
          return (
            <Link
              key={shipment.id}
              href={`/dashboard/${shipment.id}`}
              className="card block p-5 transition hover:border-slate-400"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const overdueTransit = shipment.boxes.some(
                        (b) =>
                          (b.status === "IN_TRANSIT" || b.status === "DELAYED") &&
                          daysSince(shipment.shipmentDate, now) >= 30
                      );
                      return overdueTransit ? <span title="30+ days in transit">⚠️</span> : null;
                    })()}
                    <span className="font-medium">{shipment.supplierName}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {shipment.code}
                    </span>
                    {shipment.poNumber && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                        {shipment.poNumber}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-muted">
                    {carriers.join(", ") || "—"} · {methods.join(", ") || "—"} · shipped{" "}
                    {shipment.shipmentDate.toISOString().slice(0, 10)}
                  </div>
                </div>
                <div className="text-right text-sm text-muted">
                  {shipment.boxes.length} box{shipment.boxes.length === 1 ? "" : "es"} ·{" "}
                  {units} units
                </div>
              </div>
              {thumbs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {thumbs.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-9 w-9 rounded-md border border-slate-200 object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {shipment.boxes.slice(0, 14).map((b) => (
                  <StatusBadge key={b.id} status={b.status} />
                ))}
                {shipment.boxes.length > 14 && (
                  <span className="text-xs text-muted">+{shipment.boxes.length - 14} more</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
