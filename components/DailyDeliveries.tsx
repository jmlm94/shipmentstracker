"use client";

// Daily receiving digest: groups delivered boxes by calendar day in the
// VIEWER'S timezone (grouping server-side by UTC would shift evening
// deliveries to the next day). Days with no deliveries simply don't appear.

type DeliveredBox = {
  deliveredAt: string; // ISO
  productName: string;
  units: number;
  shipmentCode: string;
  supplierName: string;
};

type DayGroup = {
  key: string;
  label: string;
  boxes: number;
  units: number;
  products: { name: string; boxes: number; units: number; shipments: string[] }[];
};

function dayLabel(d: Date, now: Date): string {
  const day = (x: Date) => x.toLocaleDateString("en-CA");
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day(d) === day(now)) return "Today";
  if (day(d) === day(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function DailyDeliveries({ boxes }: { boxes: DeliveredBox[] }) {
  if (boxes.length === 0) return null;

  const now = new Date();
  const byDay = new Map<string, { date: Date; items: DeliveredBox[] }>();
  for (const b of boxes) {
    const d = new Date(b.deliveredAt);
    const key = d.toLocaleDateString("en-CA");
    const g = byDay.get(key) || { date: d, items: [] };
    g.items.push(b);
    byDay.set(key, g);
  }

  const days: DayGroup[] = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, g]) => {
      const perProduct = new Map<string, { boxes: number; units: number; shipments: Set<string> }>();
      for (const b of g.items) {
        const p = perProduct.get(b.productName) || { boxes: 0, units: 0, shipments: new Set() };
        p.boxes += 1;
        p.units += b.units;
        p.shipments.add(`${b.shipmentCode} · ${b.supplierName}`);
        perProduct.set(b.productName, p);
      }
      return {
        key,
        label: dayLabel(g.date, now),
        boxes: g.items.length,
        units: g.items.reduce((s, b) => s + b.units, 0),
        products: [...perProduct.entries()]
          .map(([name, p]) => ({ name, boxes: p.boxes, units: p.units, shipments: [...p.shipments] }))
          .sort((a, b) => b.units - a.units),
      };
    });

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        📅 Received by day <span className="normal-case text-slate-400">(last 14 days)</span>
      </h2>
      <div className="space-y-3">
        {days.map((day) => (
          <div key={day.key} className="card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold" suppressHydrationWarning>
                {day.label}
              </span>
              <span className="text-sm text-muted">
                📦 <b className="text-ink">{day.boxes}</b> box{day.boxes === 1 ? "" : "es"} ·{" "}
                <b className="text-ink">{day.units.toLocaleString()}</b> units
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {day.products.map((p) => (
                <div key={p.name} className="flex flex-wrap justify-between gap-x-4 text-sm">
                  <span className="min-w-0">
                    {p.name}
                    <span className="ml-2 text-xs text-slate-400">{p.shipments.join(", ")}</span>
                  </span>
                  <span className="shrink-0 text-muted">
                    {p.boxes} box{p.boxes === 1 ? "" : "es"} · {p.units.toLocaleString()} units
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
