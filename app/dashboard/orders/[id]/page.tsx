import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PO_STATUS_META, money } from "@/lib/poStatus";
import { PoActions } from "../PoActions";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      shipments: {
        orderBy: { createdAt: "desc" },
        include: { boxes: { select: { productId: true, unitsReceived: true } } },
      },
    },
  });
  if (!po) notFound();

  // Received per product = sum of unitsReceived across linked shipments' boxes.
  const receivedByProduct = new Map<string, number>();
  for (const s of po.shipments) {
    for (const b of s.boxes) {
      if (b.unitsReceived != null) {
        receivedByProduct.set(b.productId, (receivedByProduct.get(b.productId) || 0) + b.unitsReceived);
      }
    }
  }

  const subtotal = po.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
  const total = subtotal + po.shippingCost + po.otherCost;
  const orderedUnits = po.items.reduce((s, it) => s + it.quantity, 0);
  const receivedUnits = po.items.reduce(
    (s, it) => s + Math.min(receivedByProduct.get(it.productId) || 0, it.quantity),
    0
  );
  const meta = PO_STATUS_META[po.status];

  return (
    <div className="max-w-4xl">
      <Link href="/dashboard/orders" className="text-sm text-muted hover:text-ink">
        ← Back to orders
      </Link>

      <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{po.code}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {po.supplierName}
            {po.supplierEmail ? ` · ✉️ ${po.supplierEmail}` : ""} · 📅 ordered{" "}
            {po.orderDate.toISOString().slice(0, 10)}
            {po.expectedDate ? ` · 🎯 expected ${po.expectedDate.toISOString().slice(0, 10)}` : ""}
          </p>
        </div>
        <PoActions id={po.id} code={po.code} status={po.status} />
      </div>

      {/* Receiving progress */}
      <div className="card mb-6 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Received {receivedUnits} of {orderedUnits} units</span>
          <span className="text-muted">
            {orderedUnits > 0 ? Math.round((receivedUnits / orderedUnits) * 100) : 0}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${orderedUnits > 0 ? Math.min(100, (receivedUnits / orderedUnits) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Items table */}
      <section className="card mb-6 overflow-x-auto p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Items</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted">
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 text-right font-medium">Ordered</th>
              <th className="pb-2 text-right font-medium">Unit cost</th>
              <th className="pb-2 text-right font-medium">Line total</th>
              <th className="pb-2 text-right font-medium">Received</th>
              <th className="pb-2 text-right font-medium">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((it) => {
              const rec = receivedByProduct.get(it.productId) || 0;
              const remaining = Math.max(0, it.quantity - rec);
              return (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {it.productImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.productImage} alt="" className="h-8 w-8 rounded object-cover" />
                      )}
                      <span>
                        {it.productName}
                        {it.sku ? <span className="text-muted"> · {it.sku}</span> : ""}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{money(it.unitCost, po.currency)}</td>
                  <td className="py-2 text-right">{money(it.quantity * it.unitCost, po.currency)}</td>
                  <td className="py-2 text-right">
                    <span className={rec >= it.quantity ? "font-semibold text-emerald-600" : ""}>
                      {rec}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {remaining > 0 ? (
                      <span className="text-amber-700">{remaining}</span>
                    ) : (
                      <span className="text-emerald-600">✓</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{money(subtotal, po.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Shipping</span>
            <span>{money(po.shippingCost, po.currency)}</span>
          </div>
          {po.otherCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">{po.otherCostLabel || "Other"}</span>
              <span>{money(po.otherCost, po.currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
            <span>Total</span>
            <span>{money(total, po.currency)}</span>
          </div>
        </div>
      </section>

      {/* Linked shipments */}
      <section className="card mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Linked shipments
        </h2>
        {po.shipments.length === 0 ? (
          <p className="text-sm text-muted">
            No shipments linked yet. When a supplier submits a shipment and selects
            this PO, it appears here.
          </p>
        ) : (
          <div className="space-y-2">
            {po.shipments.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300"
              >
                <span className="font-medium">
                  {s.supplierName} <span className="font-mono text-muted">{s.code}</span>
                </span>
                <span className="text-muted">{s.boxes.length} boxes →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {po.notes && (
        <section className="card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Notes / terms
          </h2>
          <p className="whitespace-pre-wrap text-sm">{po.notes}</p>
        </section>
      )}
    </div>
  );
}
