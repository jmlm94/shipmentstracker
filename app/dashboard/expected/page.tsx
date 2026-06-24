import { prisma } from "@/lib/prisma";
import { ExpectedManager } from "./ExpectedManager";
import { ExpectedRowActions } from "./ExpectedRowActions";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  EXPECTED: { label: "⏳ Expected", cls: "bg-blue-100 text-blue-700" },
  ARRIVED: { label: "✅ Arrived", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "✖ Cancelled", cls: "bg-slate-100 text-slate-500" },
};

export default async function ExpectedPage() {
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
            Log what&apos;s coming so the dashboard shows incoming stock. Internal
            only — suppliers don&apos;t see this.
          </p>
        </div>
        <ExpectedManager />
      </div>

      <div className="space-y-3">
        {arrivals.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">
            Nothing logged yet. Click &quot;Log expected arrival&quot; to add one.
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
                    {a.expectedDate
                      ? `📅 ${a.expectedDate.toISOString().slice(0, 10)} · `
                      : ""}
                    {a.items.length} product{a.items.length === 1 ? "" : "s"} · {totalUnits} units
                    {a.note ? ` · 📝 ${a.note}` : ""}
                  </div>
                </div>
                <ExpectedRowActions id={a.id} status={a.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1"
                  >
                    {it.productImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.productImage} alt="" className="h-7 w-7 rounded object-cover" />
                    )}
                    <span className="text-xs">
                      {it.productName}{" "}
                      <span className="font-semibold text-ink">×{it.expectedUnits}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
