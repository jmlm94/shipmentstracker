import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ALL_STATUSES, ATTENTION_STATUSES, STATUS_META } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";


export default async function OverviewPage() {
  const [grouped, shipmentCount, supplierGroups, recent, unitsAgg, discrepancyCount] =
    await Promise.all([
      prisma.box.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.shipment.count(),
      prisma.shipment.groupBy({ by: ["supplierName"], _count: { _all: true } }),
      prisma.shipment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { boxes: { orderBy: { boxNumber: "asc" } } },
      }),
      prisma.box.aggregate({ _sum: { unitsPerBox: true } }),
      prisma.box.count({ where: { hasDiscrepancy: true } }),
    ]);

  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  const totalBoxes = grouped.reduce((s, g) => s + g._count._all, 0);
  const totalUnits = unitsAgg._sum.unitsPerBox || 0;
  const attentionCount = ATTENTION_STATUSES.reduce((s, st) => s + (counts[st] || 0), 0);

  // Per-supplier box + attention counts for the breakdown table.
  const supplierStats = await Promise.all(
    supplierGroups.map(async (g) => {
      const boxes = await prisma.box.findMany({
        where: { shipment: { supplierName: g.supplierName } },
        select: { status: true },
      });
      const attention = boxes.filter((b) => STATUS_META[b.status].attention).length;
      const delivered = boxes.filter(
        (b) => b.status === "DELIVERED" || b.status === "ADDED_IN_STOCK"
      ).length;
      return {
        name: g.supplierName,
        shipments: g._count._all,
        boxes: boxes.length,
        delivered,
        attention,
      };
    })
  );
  supplierStats.sort((a, b) => b.boxes - a.boxes);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            {shipmentCount} shipments · {totalBoxes} boxes · {totalUnits} units
          </p>
        </div>
        <Link href="/dashboard/shipments" className="btn-secondary">
          View all shipments →
        </Link>
      </div>

      {/* Needs attention banner */}
      {(attentionCount > 0 || discrepancyCount > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {attentionCount > 0 && (
            <Link
              href={`/dashboard/shipments?status=${ATTENTION_STATUSES.join(",")}`}
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 transition hover:border-amber-300"
            >
              <div>
                <div className="font-semibold text-amber-900">
                  {attentionCount} box{attentionCount === 1 ? "" : "es"} need attention
                </div>
                <div className="text-sm text-amber-800">
                  {ATTENTION_STATUSES.map(
                    (s) => `${counts[s] || 0} ${STATUS_META[s].label.toLowerCase()}`
                  ).join(" · ")}
                </div>
              </div>
              <span className="text-amber-900">→</span>
            </Link>
          )}
          {discrepancyCount > 0 && (
            <Link
              href="/dashboard/shipments?discrepancy=1"
              className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-4 transition hover:border-red-300"
            >
              <div>
                <div className="font-semibold text-red-900">
                  {discrepancyCount} box{discrepancyCount === 1 ? "" : "es"} with discrepancies
                </div>
                <div className="text-sm text-red-800">
                  Received units or weight didn&apos;t match what was declared.
                </div>
              </div>
              <span className="text-red-900">→</span>
            </Link>
          )}
        </div>
      )}

      {/* Global status tiles */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/dashboard/shipments?status=${s}`}
            className="card px-3 py-4 text-left transition hover:border-slate-400"
          >
            <div className="text-2xl font-semibold">{counts[s] || 0}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By supplier */}
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            By supplier
          </h2>
          {supplierStats.length === 0 ? (
            <p className="text-sm text-muted">No shipments yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted">
                  <th className="pb-2 font-medium">Supplier</th>
                  <th className="pb-2 text-right font-medium">Boxes</th>
                  <th className="pb-2 text-right font-medium">Delivered</th>
                  <th className="pb-2 text-right font-medium">Attention</th>
                </tr>
              </thead>
              <tbody>
                {supplierStats.map((s) => (
                  <tr key={s.name} className="border-t border-slate-100">
                    <td className="py-2">
                      <Link
                        href={`/dashboard/shipments?supplier=${encodeURIComponent(s.name)}`}
                        className="hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-2 text-right">{s.boxes}</td>
                    <td className="py-2 text-right">{s.delivered}</td>
                    <td className="py-2 text-right">
                      {s.attention > 0 ? (
                        <span className="font-semibold text-amber-700">{s.attention}</span>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Recent shipments */}
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Recent shipments
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">No shipments yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((shipment) => {
                const units = shipment.boxes.reduce((sum, b) => sum + b.unitsPerBox, 0);
                return (
                  <Link
                    key={shipment.id}
                    href={`/dashboard/${shipment.id}`}
                    className="block rounded-lg border border-slate-100 p-3 transition hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{shipment.supplierName}</span>
                      <span className="text-xs text-muted">
                        {shipment.code} · {shipment.boxes.length} boxes · {units} units
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {shipment.boxes.slice(0, 10).map((b) => (
                        <StatusBadge key={b.id} status={b.status} />
                      ))}
                      {shipment.boxes.length > 10 && (
                        <span className="text-xs text-muted">
                          +{shipment.boxes.length - 10}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
