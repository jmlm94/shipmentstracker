import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PO_STATUS_META, money } from "@/lib/poStatus";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, _count: { select: { shipments: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">🧾 Purchase orders</h1>
          <p className="mt-1 text-sm text-muted">
            Orders you create. Suppliers locate these on the intake form to match
            their shipments.
          </p>
        </div>
        <Link href="/dashboard/orders/new" className="btn">
          ＋ New order
        </Link>
      </div>

      <div className="space-y-3">
        {orders.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">
            No purchase orders yet. Click <strong>New order</strong> to create one.
          </div>
        )}
        {orders.map((o) => {
          const subtotal = o.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
          const total = subtotal + o.shippingCost + o.otherCost;
          const units = o.items.reduce((s, it) => s + it.quantity, 0);
          const meta = PO_STATUS_META[o.status];
          return (
            <Link
              key={o.id}
              href={`/dashboard/orders/${o.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{o.code}</span>
                  <span className="font-medium">{o.supplierName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  📅 {o.orderDate.toISOString().slice(0, 10)} · {o.items.length} product
                  {o.items.length === 1 ? "" : "s"} · {units} units
                  {o._count.shipments > 0 ? ` · 📦 ${o._count.shipments} shipment(s)` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{money(total, o.currency)}</div>
                <div className="text-xs text-muted">total</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
