import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { BoxStatusEditor } from "@/components/BoxStatusEditor";

export const dynamic = "force-dynamic";

const CARRIER_LABEL: Record<string, string> = { FEDEX: "FedEx", DHL: "DHL", UPS: "UPS" };

export default async function ShipmentDetail({ params }: { params: { id: string } }) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
    include: {
      boxes: {
        orderBy: { boxNumber: "asc" },
        include: { events: { orderBy: { createdAt: "desc" }, take: 5 } },
      },
    },
  });

  if (!shipment) notFound();

  const totalUnits = shipment.boxes.reduce((s, b) => s + b.unitsPerBox, 0);

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
        ← Back to shipments
      </Link>

      <div className="mt-3 mb-6">
        <h1 className="text-2xl font-semibold">{shipment.supplierName}</h1>
        <p className="mt-1 text-sm text-muted">
          {CARRIER_LABEL[shipment.carrier]} ·{" "}
          {shipment.shippingMethod === "AIR" ? "Air" : "Sea"} · shipped{" "}
          {shipment.shipmentDate.toISOString().slice(0, 10)} · {shipment.boxes.length}{" "}
          boxes · {totalUnits} units
          {shipment.supplierEmail ? ` · ${shipment.supplierEmail}` : ""}
        </p>
        {shipment.notes && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {shipment.notes}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {shipment.boxes.map((box) => (
          <div key={box.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Box #{box.boxNumber}
                  </span>
                  <StatusBadge status={box.status} />
                </div>
                <div className="mt-1 font-medium">
                  {box.productName ? `${box.productName} ` : ""}
                  <span className="text-muted">({box.productId})</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm text-muted sm:grid-cols-4">
                  <span>
                    Tracking: <span className="font-mono text-ink">{box.trackingNumber}</span>
                  </span>
                  <span>Units: {box.unitsPerBox}</span>
                  <span>Weight: {box.weightOfBox} lbs</span>
                  {box.weightReceived != null && (
                    <span>Received: {box.weightReceived} lbs</span>
                  )}
                  {box.unitsReceived != null && (
                    <span>Units received: {box.unitsReceived}</span>
                  )}
                  {box.condition && (
                    <span>
                      Condition: {box.condition === "GOOD" ? "Good" : "Lost units"}
                    </span>
                  )}
                  {box.lastCarrierStatus && (
                    <span className="col-span-2">Carrier: {box.lastCarrierStatus}</span>
                  )}
                </div>
              </div>
              <BoxStatusEditor
                boxId={box.id}
                current={box.status}
                weightOfBox={box.weightOfBox}
                weightReceived={box.weightReceived}
                unitsReceived={box.unitsReceived}
                condition={box.condition}
              />
            </div>

            {box.events.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2">
                <ul className="space-y-0.5 text-xs text-muted">
                  {box.events.map((ev) => (
                    <li key={ev.id}>
                      {ev.createdAt.toISOString().slice(0, 16).replace("T", " ")} ·{" "}
                      {ev.fromStatus ? `${ev.fromStatus} → ` : ""}
                      {ev.toStatus}
                      {ev.message ? ` · ${ev.message}` : ""}{" "}
                      <span className="text-slate-400">({ev.source})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
