import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PO_STATUS_META } from "@/lib/poStatus";
import { ReceivePanel } from "./ReceivePanel";

export const dynamic = "force-dynamic";

export default async function ReceiveOrderPage({ params }: { params: { id: string } }) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      shipments: { include: { boxes: { select: { productId: true, unitsReceived: true } } } },
    },
  });
  if (!po) notFound();

  // Units already received per product from scanned boxes (informational).
  const shippedReceived = new Map<string, number>();
  for (const s of po.shipments) {
    for (const b of s.boxes) {
      if (b.unitsReceived != null) {
        shippedReceived.set(b.productId, (shippedReceived.get(b.productId) || 0) + b.unitsReceived);
      }
    }
  }

  const meta = PO_STATUS_META[po.status];

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/receive" className="text-sm text-muted hover:text-ink">
        ← Back to receiving
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{po.code}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
        <span className="text-sm text-muted">{po.supplierName}</span>
      </div>

      <ReceivePanel
        orderId={po.id}
        items={po.items.map((it) => ({
          id: it.id,
          productName: it.productName,
          productImage: it.productImage,
          sku: it.sku,
          quantity: it.quantity,
          receivedQty: Math.min(it.receivedQty, it.quantity),
          fromBoxes: Math.min(it.quantity, shippedReceived.get(it.productId) || 0),
        }))}
      />
    </div>
  );
}
