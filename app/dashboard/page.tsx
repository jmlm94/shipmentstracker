import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ALL_STATUSES, ATTENTION_STATUSES, STATUS_META } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import { RefreshTrackingButton } from "@/components/RefreshTrackingButton";
import { etaFor, daysUntil, daysSince, TERMINAL_STATUSES } from "@/lib/eta";

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

  const expected = await prisma.expectedArrival.findMany({
    where: { status: "EXPECTED" },
    orderBy: [{ expectedDate: "asc" }, { createdAt: "desc" }],
    take: 5,
    include: { items: true },
  });

  const now = new Date();
  const latestSync = await prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } });
  const syncStale = latestSync
    ? daysSince(latestSync.startedAt, now) >= 1 ||
      now.getTime() - latestSync.startedAt.getTime() > 26 * 60 * 60 * 1000
    : true;

  // Overdue shipments (past ETA with non-terminal boxes) — for the Alerts banner.
  const inTransit = await prisma.shipment.findMany({
    where: { boxes: { some: { status: { notIn: TERMINAL_STATUSES } } } },
    include: { lines: { select: { shippingMethod: true } }, boxes: { select: { status: true } } },
  });
  const overdueShipments = inTransit
    .map((s) => {
      const eta = s.lines.length
        ? new Date(
            Math.min(
              ...s.lines.map((l) =>
                etaFor(s.shipmentDate, l.shippingMethod, s.expectedDeliveryDate).getTime()
              )
            )
          )
        : etaFor(s.shipmentDate, "AIR", s.expectedDeliveryDate);
      return { s, remaining: daysUntil(eta, now) };
    })
    .filter((x) => x.remaining <= 0)
    .sort((a, b) => a.remaining - b.remaining);

  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  const totalBoxes = grouped.reduce((s, g) => s + g._count._all, 0);
  const totalUnits = unitsAgg._sum.unitsPerBox || 0;
  const attentionCount = ATTENTION_STATUSES.reduce((s, st) => s + (counts[st] || 0), 0);

  // Per-supplier metrics for the breakdown table.
  const supplierStats = await Promise.all(
    supplierGroups.map(async (g) => {
      const boxes = await prisma.box.findMany({
        where: { shipment: { supplierName: g.supplierName } },
        select: {
          status: true,
          deliveredAt: true,
          shipment: { select: { shipmentDate: true } },
        },
      });
      const attention = boxes.filter((b) => STATUS_META[b.status].attention).length;
      const inTransit = boxes.filter(
        (b) => b.status === "IN_TRANSIT" || b.status === "PENDING"
      ).length;
      const delivered = boxes.filter(
        (b) => b.status === "DELIVERED" || b.status === "ADDED_IN_STOCK"
      ).length;
      // Average days from shipment date to delivery, over delivered boxes.
      const deliveredWithDates = boxes.filter((b) => b.deliveredAt);
      const avgDays =
        deliveredWithDates.length > 0
          ? Math.round(
              deliveredWithDates.reduce(
                (s, b) =>
                  s +
                  (b.deliveredAt!.getTime() - b.shipment.shipmentDate.getTime()) /
                    (24 * 60 * 60 * 1000),
                0
              ) / deliveredWithDates.length
            )
          : null;
      const lastShipment = boxes.reduce<Date | null>((max, b) => {
        const d = b.shipment.shipmentDate;
        return !max || d > max ? d : max;
      }, null);
      return {
        name: g.supplierName,
        boxes: boxes.length,
        inTransit,
        delivered,
        attention,
        avgDays,
        lastShipment,
      };
    })
  );
  // Worst performers (most attention) first.
  supplierStats.sort((a, b) => b.attention - a.attention || b.boxes - a.boxes);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            {shipmentCount} shipments · {totalBoxes} boxes · {totalUnits} units
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={syncStale ? "font-medium text-amber-600" : "text-muted"}>
              🔄 Tracking last refreshed:{" "}
              {latestSync
                ? `${latestSync.startedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`
                : "never"}
              {syncStale ? " (may be stale)" : ""}
            </span>
            <RefreshTrackingButton />
          </p>
        </div>
        <Link href="/dashboard/shipments" className="btn-secondary">
          View all shipments →
        </Link>
      </div>

      {/* Overdue alerts */}
      {overdueShipments.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4">
          <div className="mb-2 font-semibold text-red-900">
            🚨 {overdueShipments.length} overdue shipment{overdueShipments.length === 1 ? "" : "s"}
          </div>
          <div className="space-y-1">
            {overdueShipments.slice(0, 6).map(({ s, remaining }) => (
              <Link
                key={s.id}
                href={`/dashboard/${s.id}`}
                className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-1.5 text-sm hover:bg-white"
              >
                <span className="font-medium text-red-900">
                  {s.supplierName} · {s.code}
                  {s.poNumber ? ` · ${s.poNumber}` : ""}
                </span>
                <span className="text-xs font-semibold text-red-700">{Math.abs(remaining)}d overdue</span>
              </Link>
            ))}
          </div>
        </div>
      )}

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

      {expected.length > 0 && (
        <section className="card mb-6 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              ⏳ Incoming (expected)
            </h2>
            <Link href="/dashboard/expected" className="text-sm text-muted hover:text-ink">
              Manage →
            </Link>
          </div>
          <div className="space-y-2">
            {expected.map((a) => {
              const units = a.items.reduce((s, it) => s + it.expectedUnits, 0);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{a.supplierName}</span>
                  <span className="text-muted">
                    {a.expectedDate ? `${a.expectedDate.toISOString().slice(0, 10)} · ` : ""}
                    {a.items.length} product{a.items.length === 1 ? "" : "s"} · {units} units
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* By supplier */}
      <section className="card mb-6 overflow-x-auto p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          By supplier
        </h2>
        {supplierStats.length === 0 ? (
          <p className="text-sm text-muted">No shipments yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted">
                <th className="pb-2 font-medium">Supplier</th>
                <th className="pb-2 text-right font-medium">Total boxes</th>
                <th className="pb-2 text-right font-medium">In transit</th>
                <th className="pb-2 text-right font-medium">Delivered</th>
                <th className="pb-2 text-right font-medium">Attention</th>
                <th className="pb-2 text-right font-medium">Last shipment</th>
                <th className="pb-2 text-right font-medium">Avg days</th>
              </tr>
            </thead>
            <tbody>
              {supplierStats.map((s) => (
                <tr key={s.name} className="border-t border-slate-100">
                  <td className="py-2">
                    <Link
                      href={`/dashboard/shipments?supplier=${encodeURIComponent(s.name)}`}
                      className="font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-2 text-right">{s.boxes}</td>
                  <td className="py-2 text-right">{s.inTransit}</td>
                  <td className="py-2 text-right">{s.delivered}</td>
                  <td className="py-2 text-right">
                    {s.attention > 0 ? (
                      <span className="font-semibold text-amber-700">{s.attention}</span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-muted">
                    {s.lastShipment ? s.lastShipment.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="py-2 text-right text-muted">
                    {s.avgDays != null ? `${s.avgDays}d` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6">
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
