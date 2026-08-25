import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ALL_STATUSES, ATTENTION_STATUSES, STATUS_META } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import { RefreshTrackingButton } from "@/components/RefreshTrackingButton";
import { TestSlackButton } from "@/components/TestSlackButton";
import { TestEasyPostButton } from "@/components/TestEasyPostButton";
import { CountUp } from "@/components/CountUp";
import { Logo } from "@/components/Logo";
import { etaFor, daysUntil, daysSince, TERMINAL_STATUSES } from "@/lib/eta";

export const dynamic = "force-dynamic";


export default async function OverviewPage() {
  const [grouped, shipmentCount, recent, unitsAgg, poGroups, inStockAgg] =
    await Promise.all([
      prisma.box.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.shipment.count(),
      prisma.shipment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { boxes: { orderBy: { boxNumber: "asc" } } },
      }),
      prisma.box.aggregate({ _sum: { unitsPerBox: true } }),
      prisma.purchaseOrder.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.box.aggregate({
        _sum: { unitsPerBox: true },
        where: { status: "ADDED_IN_STOCK" },
      }),
    ]);

  const now = new Date();
  const latestSync = await prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } });
  const syncStale = latestSync
    ? daysSince(latestSync.startedAt, now) >= 1 ||
      now.getTime() - latestSync.startedAt.getTime() > 26 * 60 * 60 * 1000
    : true;

  // Overdue shipments (past ETA with non-terminal boxes) — for the Alerts banner.
  const inTransit = await prisma.shipment.findMany({
    where: { boxes: { some: { status: { notIn: TERMINAL_STATUSES } } } },
    select: {
      id: true,
      code: true,
      poNumber: true,
      supplierName: true,
      shipmentDate: true,
      expectedDeliveryDate: true,
      lines: { select: { shippingMethod: true } },
    },
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

  // Headline KPIs for the hero band.
  const poCounts = Object.fromEntries(poGroups.map((g) => [g.status, g._count._all]));
  const inTransitBoxes = (counts.IN_TRANSIT || 0) + (counts.OUT_FOR_DELIVERY || 0);
  const openOrders =
    (poCounts.DRAFT || 0) + (poCounts.OPEN || 0) + (poCounts.PARTIALLY_RECEIVED || 0);
  const inStockUnits = inStockAgg._sum.unitsPerBox || 0;

  // Per-supplier metrics for the breakdown table. Pull every box once and group
  // in memory — running one findMany per supplier opened a DB connection per
  // supplier and could exhaust the Postgres pool as the data grew.
  const statBoxes = await prisma.box.findMany({
    select: {
      status: true,
      deliveredAt: true,
      shipment: { select: { supplierName: true, shipmentDate: true } },
    },
  });
  type StatBox = (typeof statBoxes)[number];
  const bySupplier = new Map<string, StatBox[]>();
  for (const b of statBoxes) {
    const name = b.shipment.supplierName;
    const arr = bySupplier.get(name);
    if (arr) arr.push(b);
    else bySupplier.set(name, [b]);
  }
  const supplierStats = Array.from(bySupplier.entries()).map(([name, boxes]) => {
    const attention = boxes.filter((b) => STATUS_META[b.status]?.attention).length;
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
      name,
      boxes: boxes.length,
      inTransit,
      delivered,
      attention,
      avgDays,
      lastShipment,
    };
  });
  // Worst performers (most attention) first.
  supplierStats.sort((a, b) => b.attention - a.attention || b.boxes - a.boxes);

  return (
    <div>
      {/* Brand hero with headline KPIs */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-ink text-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6 sm:px-8">
          <div>
            <Logo className="h-6 w-auto" />
            <p className="mt-2 text-sm text-white/55">
              <CountUp value={shipmentCount} className="font-semibold text-white" /> shipments ·{" "}
              <CountUp value={totalBoxes} className="font-semibold text-white" /> boxes ·{" "}
              <CountUp value={totalUnits} className="font-semibold text-white" /> units tracked
            </p>
          </div>
          <Link
            href="/dashboard/shipments"
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            View all shipments →
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
          {[
            {
              label: "In transit",
              value: inTransitBoxes,
              sub: "boxes on the way",
              href: "/dashboard/shipments?status=IN_TRANSIT",
              accent: "text-white",
            },
            {
              label: "Overdue",
              value: overdueShipments.length,
              sub: "past their ETA",
              href: "#overdue",
              accent: overdueShipments.length > 0 ? "text-accent" : "text-white",
            },
            {
              label: "Open orders",
              value: openOrders,
              sub: "not fully received",
              href: "/dashboard/orders",
              accent: "text-white",
            },
            {
              label: "In stock",
              value: inStockUnits,
              sub: "units received",
              href: "/dashboard/shipments?status=ADDED_IN_STOCK",
              accent: "text-brand-500",
            },
          ].map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className="group bg-ink px-6 py-5 transition hover:bg-carbon sm:px-8"
            >
              <div className="text-[11px] font-medium uppercase tracking-wide text-white/45">
                {k.label}
              </div>
              <CountUp value={k.value} className={`mt-1 block text-3xl font-bold tracking-tight ${k.accent}`} />
              <div className="mt-0.5 text-xs text-white/45">{k.sub}</div>
            </Link>
          ))}
        </div>

        {/* Tracking status + integration tools */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 px-6 py-3 text-xs sm:px-8">
          <span className="relative flex h-2 w-2" title={syncStale ? "Tracking may be stale" : "Tracking live"}>
            {!syncStale && (
              <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-emerald-400" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                syncStale ? "bg-amber-400" : "bg-emerald-500"
              }`}
            />
          </span>
          <span className={syncStale ? "font-medium text-amber-300" : "text-white/55"}>
            Tracking last refreshed:{" "}
            {latestSync
              ? `${latestSync.startedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`
              : "never"}
            {syncStale ? " (may be stale)" : ""}
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <RefreshTrackingButton />
            <TestSlackButton />
            <TestEasyPostButton />
          </span>
        </div>
      </section>

      {/* Overdue alerts */}
      {overdueShipments.length > 0 && (
        <div id="overdue" className="mb-6 scroll-mt-6 rounded-xl border border-red-300 bg-red-50 p-4">
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
      {attentionCount > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3">
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
        </div>
      )}

      {/* Global status tiles */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Boxes by status
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/dashboard/shipments?status=${s}`}
            className="card group px-4 py-4 text-left hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex items-center justify-between">
              <CountUp value={counts[s] || 0} className="text-3xl font-bold tracking-tight" />
              <span className="text-lg opacity-80 transition group-hover:-translate-y-0.5 group-hover:scale-125">
                {STATUS_META[s].emoji}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
            </div>
          </Link>
        ))}
      </div>

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
