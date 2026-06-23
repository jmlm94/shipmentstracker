import Link from "next/link";
import { BoxStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ALL_STATUSES, STATUS_META } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const CARRIER_LABEL: Record<string, string> = { FEDEX: "FedEx", DHL: "DHL", UPS: "UPS" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const statusFilter = ALL_STATUSES.includes(searchParams.status as BoxStatus)
    ? (searchParams.status as BoxStatus)
    : undefined;
  const q = (searchParams.q || "").trim();

  // Counts per status for the summary cards.
  const grouped = await prisma.box.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  const totalBoxes = grouped.reduce((s, g) => s + g._count._all, 0);

  const shipments = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    where: q
      ? {
          OR: [
            { supplierName: { contains: q, mode: "insensitive" } },
            { boxes: { some: { trackingNumber: { contains: q, mode: "insensitive" } } } },
            { boxes: { some: { productId: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    include: {
      boxes: statusFilter
        ? { where: { status: statusFilter }, orderBy: { boxNumber: "asc" } }
        : { orderBy: { boxNumber: "asc" } },
    },
  });

  const visibleShipments = statusFilter
    ? shipments.filter((s) => s.boxes.length > 0)
    : shipments;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shipments</h1>
          <p className="mt-1 text-sm text-muted">{totalBoxes} boxes tracked</p>
        </div>
      </div>

      {/* Status summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Link
          href="/dashboard"
          className={`card px-3 py-3 text-left transition hover:border-slate-400 ${
            !statusFilter ? "ring-2 ring-slate-900/10" : ""
          }`}
        >
          <div className="text-2xl font-semibold">{totalBoxes}</div>
          <div className="text-xs text-muted">All boxes</div>
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/dashboard?status=${s}`}
            className={`card px-3 py-3 text-left transition hover:border-slate-400 ${
              statusFilter === s ? "ring-2 ring-slate-900/10" : ""
            }`}
          >
            <div className="text-2xl font-semibold">{counts[s] || 0}</div>
            <div className="text-xs text-muted">{STATUS_META[s].label}</div>
          </Link>
        ))}
      </div>

      {/* Search */}
      <form className="mb-4" action="/dashboard">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <input
          className="input max-w-md"
          name="q"
          defaultValue={q}
          placeholder="Search supplier, tracking number or SKU…"
        />
      </form>

      {/* Shipment list */}
      <div className="space-y-4">
        {visibleShipments.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">
            No shipments{q ? " match your search" : " yet"}.
          </div>
        )}
        {visibleShipments.map((shipment) => {
          const units = shipment.boxes.reduce((sum, b) => sum + b.unitsPerBox, 0);
          return (
            <Link
              key={shipment.id}
              href={`/dashboard/${shipment.id}`}
              className="card block p-5 transition hover:border-slate-400"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{shipment.supplierName}</div>
                  <div className="mt-0.5 text-sm text-muted">
                    {CARRIER_LABEL[shipment.carrier]} ·{" "}
                    {shipment.shippingMethod === "AIR" ? "Air" : "Sea"} · shipped{" "}
                    {shipment.shipmentDate.toISOString().slice(0, 10)}
                  </div>
                </div>
                <div className="text-right text-sm text-muted">
                  {shipment.boxes.length} box{shipment.boxes.length === 1 ? "" : "es"} ·{" "}
                  {units} units
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {shipment.boxes.slice(0, 12).map((b) => (
                  <StatusBadge key={b.id} status={b.status} />
                ))}
                {shipment.boxes.length > 12 && (
                  <span className="text-xs text-muted">
                    +{shipment.boxes.length - 12} more
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
