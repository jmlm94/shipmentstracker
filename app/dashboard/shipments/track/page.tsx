import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProductImageResolver } from "@/lib/productImages";
import { QuickTrackForm, type TrackOrder } from "./QuickTrackForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add tracking · Shipments Tracker" };

export default async function QuickTrackPage({
  searchParams,
}: {
  searchParams: { po?: string };
}) {
  const orders = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["DRAFT", "OPEN", "PARTIALLY_RECEIVED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      shipments: { include: { boxes: { select: { productId: true, unitsPerBox: true } } } },
    },
  });

  const img = await getProductImageResolver();
  const data: TrackOrder[] = orders.map((o) => {
    const shipped = new Map<string, number>();
    for (const s of o.shipments) {
      for (const b of s.boxes) shipped.set(b.productId, (shipped.get(b.productId) || 0) + b.unitsPerBox);
    }
    return {
      id: o.id,
      code: o.code,
      supplier: o.supplierName,
      items: o.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        productImage: img(it.productId, it.productImage, it.productName),
        sku: it.sku,
        quantity: it.quantity,
        remaining: Math.max(0, it.quantity - (shipped.get(it.productId) || 0)),
      })),
    };
  });

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/shipments" className="text-sm text-muted hover:text-ink">
        ← Back to shipments
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-semibold">🏷️ Add tracking to an order</h1>
        <p className="mt-1 text-sm text-muted">
          Internal shortcut — pick a purchase order, drop in the tracking number(s), and
          we link it to the order. No box-by-box detail needed; the number covers the
          ordered units and feeds live tracking, receiving, and roll-up.
        </p>
      </div>
      {data.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No open purchase orders. Create or finalize one first.
        </div>
      ) : (
        <QuickTrackForm orders={data} preselectId={searchParams.po || null} />
      )}
    </div>
  );
}
