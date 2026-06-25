import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ExpectedManager } from "./ExpectedManager";
import { ExpectedRowActions } from "./ExpectedRowActions";
import { etaFor, daysUntil, TERMINAL_STATUSES } from "@/lib/eta";
import { METHOD_LABEL } from "@/lib/status";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  EXPECTED: { label: "⏳ Expected", cls: "bg-blue-100 text-blue-700" },
  ARRIVED: { label: "✅ Arrived", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "✖ Cancelled", cls: "bg-slate-100 text-slate-500" },
};

export default async function ExpectedPage() {
  const now = new Date();

  // Auto-populated: shipments still in transit (any non-terminal box).
  const shipments = await prisma.shipment.findMany({
    where: { boxes: { some: { status: { notIn: TERMINAL_STATUSES } } } },
    include: {
      lines: { select: { shippingMethod: true } },
      boxes: { select: { status: true } },
    },
  });

  const incoming = shipments
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
      const remaining = daysUntil(eta, now);
      const openBoxes = s.boxes.filter((b) => !TERMINAL_STATUSES.includes(b.status)).length;
      const methods = Array.from(new Set(s.lines.map((l) => METHOD_LABEL[l.shippingMethod])));
      return { s, eta, remaining, openBoxes, methods };
    })
    .sort((a, b) => a.remaining - b.remaining);

  const overdueCount = incoming.filter((i) => i.remaining <= 0).length;

  const arrivals = await prisma.expectedArrival.findMany({
    orderBy: [{ status: "asc" }, { expectedDate: "asc" }, { createdAt: "desc" }],
    include: { items: true },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">📥 Expected arrivals</h1>
          <p className="mt-1 text-sm text-muted">
            Every in-transit shipment with its ETA (Air = 45 days, Sea = 60 days, or
            the supplier&apos;s date). {overdueCount > 0 && (
              <span className="font-semibold text-red-600">{overdueCount} overdue.</span>
            )}
          </p>
        </div>
        <ExpectedManager />
      </div>

      {/* Auto: incoming shipments */}
      <section className="card mb-6 overflow-x-auto p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Incoming shipments
        </h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted">Nothing in transit right now.</p>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted">
                <th className="pb-2 font-medium">Supplier</th>
                <th className="pb-2 font-medium">PO</th>
                <th className="pb-2 font-medium">Shipped</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">ETA</th>
                <th className="pb-2 text-right font-medium">Days left</th>
                <th className="pb-2 text-right font-medium">Open boxes</th>
              </tr>
            </thead>
            <tbody>
              {incoming.map(({ s, eta, remaining, openBoxes, methods }) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-2">
                    <Link href={`/dashboard/${s.id}`} className="font-medium hover:underline">
                      {s.supplierName}
                    </Link>
                    <span className="ml-1 font-mono text-xs text-muted">{s.code}</span>
                  </td>
                  <td className="py-2 font-mono text-xs text-muted">{s.poNumber || "—"}</td>
                  <td className="py-2 text-muted">{s.shipmentDate.toISOString().slice(0, 10)}</td>
                  <td className="py-2 text-muted">{methods.join(", ") || "—"}</td>
                  <td className="py-2 text-muted">{eta.toISOString().slice(0, 10)}</td>
                  <td className="py-2 text-right">
                    {remaining <= 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        OVERDUE
                      </span>
                    ) : (
                      <span className={remaining <= 7 ? "font-semibold text-amber-700" : ""}>
                        {remaining}d
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">{openBoxes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Manual log */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Manually logged
        </h2>
        <div className="space-y-3">
          {arrivals.length === 0 && (
            <div className="card p-6 text-center text-sm text-muted">
              Nothing logged manually. Use &quot;Log expected arrival&quot; for items not yet
              in a shipment.
            </div>
          )}
          {arrivals.map((a) => {
            const totalUnits = a.items.reduce((s, it) => s + it.expectedUnits, 0);
            const meta = STATUS_META[a.status];
            return (
              <div
                key={a.id}
                className={`card p-4 ${a.status === "CANCELLED" ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.supplierName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm text-muted">
                      {a.expectedDate ? `📅 ${a.expectedDate.toISOString().slice(0, 10)} · ` : ""}
                      {a.items.length} product{a.items.length === 1 ? "" : "s"} · {totalUnits} units
                      {a.note ? ` · 📝 ${a.note}` : ""}
                    </div>
                  </div>
                  <ExpectedRowActions id={a.id} status={a.status} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
