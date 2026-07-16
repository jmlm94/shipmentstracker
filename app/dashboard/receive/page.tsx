import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PO_STATUS_META } from "@/lib/poStatus";
import { DailyDeliveries } from "@/components/DailyDeliveries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receive · Shipments Tracker" };

export default async function ReceivePage() {
  // Orders open for receiving (drafts aren't receivable; received/cancelled are done).
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["OPEN", "PARTIALLY_RECEIVED"] } },
    orderBy: { orderDate: "asc" },
    include: { items: true },
  });

  // Boxes delivered in the last 14 days, for the daily receiving digest.
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const deliveredBoxes = await prisma.box.findMany({
    where: { deliveredAt: { gte: since } },
    orderBy: { deliveredAt: "desc" },
    select: {
      deliveredAt: true,
      productName: true,
      productId: true,
      unitsPerBox: true,
      unitsReceived: true,
      shipment: { select: { code: true, supplierName: true } },
    },
  });
  const digest = deliveredBoxes
    .filter((b) => b.deliveredAt)
    .map((b) => ({
      deliveredAt: b.deliveredAt!.toISOString(),
      productName: b.productName || b.productId,
      units: b.unitsReceived ?? b.unitsPerBox,
      shipmentCode: b.shipment.code,
      supplierName: b.shipment.supplierName,
    }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">📥 Receive</h1>
          <p className="mt-1 text-sm text-muted">
            Open purchase orders. Click one to mark items delivered — fully or
            partially. Carrier-delivered boxes update these automatically.
          </p>
        </div>
      </div>

      <DailyDeliveries boxes={digest} />

      {orders.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No open orders to receive. Finalize a draft order (or create one) to start receiving.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const ordered = o.items.reduce((s, it) => s + it.quantity, 0);
            const received = o.items.reduce((s, it) => s + Math.min(it.receivedQty, it.quantity), 0);
            const pct = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
            const meta = PO_STATUS_META[o.status];
            return (
              <Link
                key={o.id}
                href={`/dashboard/receive/${o.id}`}
                className="card block p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{o.code}</span>
                    <span className="font-medium">{o.supplierName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-sm text-muted">
                    {received} / {ordered} units · {pct}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
