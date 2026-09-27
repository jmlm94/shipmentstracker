import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { shopifyConfigured } from "@/lib/shopify";
import { restockPlan, REORDER_LEAD_DAYS, REORDER_CYCLE_DAYS } from "@/lib/restock";
import { SyncShopifyButton } from "@/components/SyncShopifyButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Restock · Shipments Tracker" };

const WINDOW_DAYS = 30;

const URGENCY_META = {
  now: { label: "Order now", cls: "bg-red-100 text-red-700" },
  soon: { label: "Order soon", cls: "bg-amber-100 text-amber-800" },
  ok: { label: "Covered", cls: "bg-emerald-100 text-emerald-700" },
  "no-sales": { label: "No sales", cls: "bg-slate-100 text-slate-500" },
} as const;

const ORDER = { now: 0, soon: 1, ok: 2, "no-sales": 3 } as const;

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

export default async function RestockPage() {
  const linked = await prisma.product.findMany({
    where: { shopifyVariantId: { not: null } },
    orderBy: { name: "asc" },
  });

  // Units sold per linked variant over the window.
  const since = new Date(Date.now() - WINDOW_DAYS * 86400e3);
  const sales = linked.length
    ? await prisma.shopifySale.groupBy({
        by: ["variantId"],
        where: { variantId: { in: linked.map((p) => p.shopifyVariantId!) }, date: { gte: since } },
        _sum: { units: true },
      })
    : [];
  const soldByVariant = new Map(sales.map((s) => [s.variantId, s._sum.units || 0]));

  // Units already ordered and not yet received, per product, across open POs.
  // Matched by product id, with a name fallback for items created from the
  // bundled catalog before the products table existed.
  const openItems = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrder: { status: { in: ["OPEN", "PARTIALLY_RECEIVED"] } } },
    select: { productId: true, productName: true, quantity: true, receivedQty: true },
  });
  const incomingFor = (p: { id: string; name: string }) =>
    openItems
      .filter(
        (it) =>
          it.productId === p.id ||
          it.productName.trim().toLowerCase() === p.name.trim().toLowerCase()
      )
      .reduce((s, it) => s + Math.max(0, it.quantity - Math.min(it.receivedQty, it.quantity)), 0);

  const rows = linked
    .map((p) => {
      const unitsSold = soldByVariant.get(p.shopifyVariantId!) || 0;
      const incoming = incomingFor(p);
      const onHand = p.shopifyOnHand ?? 0;
      const plan = restockPlan({ onHand, incoming, unitsSold, windowDays: WINDOW_DAYS });
      return { p, unitsSold, incoming, onHand, plan };
    })
    .sort(
      (a, b) =>
        ORDER[a.plan.urgency] - ORDER[b.plan.urgency] ||
        (a.plan.daysUntilOrder ?? 1e9) - (b.plan.daysUntilOrder ?? 1e9)
    );

  const lastSync = linked.reduce<Date | null>(
    (m, p) => (p.shopifySyncedAt && (!m || p.shopifySyncedAt > m) ? p.shopifySyncedAt : m),
    null
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">📈 Restock planner</h1>
          <p className="mt-1 text-sm text-muted">
            Sales pace from Shopify ({WINDOW_DAYS}-day average) vs. stock on hand and units already
            on order. Assumes <strong>{REORDER_LEAD_DAYS} days</strong> from placing an order to
            receiving it; suggested quantities cover {REORDER_CYCLE_DAYS} days after arrival.
          </p>
          {lastSync && (
            <p className="mt-1 text-xs text-muted">
              Last synced {lastSync.toISOString().slice(0, 16).replace("T", " ")} UTC · syncs daily
              automatically
            </p>
          )}
        </div>
        {shopifyConfigured() && <SyncShopifyButton />}
      </div>

      {linked.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No products are linked to Shopify yet.{" "}
          <Link href="/dashboard/products/shopify" className="text-blue-600 hover:underline">
            Link your products
          </Link>{" "}
          to see sales pace and reorder dates here.
        </div>
      ) : (
        <div className="card overflow-x-auto p-5">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 text-right font-medium">Sold / day</th>
                <th className="pb-2 text-right font-medium">On hand</th>
                <th className="pb-2 text-right font-medium">Incoming</th>
                <th className="pb-2 text-right font-medium">Days of cover</th>
                <th className="pb-2 text-right font-medium">Order by</th>
                <th className="pb-2 text-right font-medium">Suggested qty</th>
                <th className="pb-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, incoming, onHand, plan }) => {
                const meta = URGENCY_META[plan.urgency];
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        {p.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{p.name}</span>
                          {(p.shopifySku || p.sku) && (
                            <span className="text-xs text-muted">{p.shopifySku || p.sku}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {plan.velocity > 0 ? plan.velocity.toFixed(1) : "—"}
                    </td>
                    <td className={`py-2.5 text-right tabular-nums ${onHand < 0 ? "font-semibold text-red-600" : ""}`}>
                      {onHand.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-blue-600">
                      {incoming > 0 ? incoming.toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {plan.daysOfCover !== null ? Math.floor(plan.daysOfCover) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {plan.urgency === "now" ? (
                        <span className="font-semibold text-red-600">overdue</span>
                      ) : (
                        fmtDate(plan.orderByDate)
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {plan.suggestedQty > 0 ? plan.suggestedQty.toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted">
            Negative on-hand means Shopify shows the item oversold — those need an order
            immediately. &quot;Incoming&quot; counts unreceived units on open purchase orders, so a
            PO you just placed moves the order-by date out automatically.
          </p>
        </div>
      )}
    </div>
  );
}
