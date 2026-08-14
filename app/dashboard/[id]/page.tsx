import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { BoxStatusEditor } from "@/components/BoxStatusEditor";
import { PhotoUpload } from "@/components/PhotoUpload";
import { DeleteShipmentButton } from "@/components/DeleteShipmentButton";
import { LineEditor } from "@/components/LineEditor";
import { CARRIER_LABEL, METHOD_LABEL } from "@/lib/status";
import { trackingUrl } from "@/lib/trackingLinks";
import { daysSince, etaFor, transitSeverity } from "@/lib/eta";

export const dynamic = "force-dynamic";

const SEV_CLASS = {
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
};

export default async function ShipmentDetail({ params }: { params: { id: string } }) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
    include: {
      lines: {
        orderBy: { id: "asc" },
        include: {
          boxes: {
            orderBy: { boxNumber: "asc" },
            include: {
              events: { orderBy: { createdAt: "desc" }, take: 5 },
              photos: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!shipment) notFound();

  const allBoxes = shipment.lines.flatMap((l) => l.boxes);
  const totalUnits = allBoxes.reduce((s, b) => s + b.unitsPerBox, 0);
  const now = new Date();
  // ETA is supplier-provided, else the earliest computed lead time across lines.
  const eta = shipment.lines.length
    ? new Date(
        Math.min(
          ...shipment.lines.map((l) =>
            etaFor(shipment.shipmentDate, l.shippingMethod, shipment.expectedDeliveryDate).getTime()
          )
        )
      )
    : null;

  return (
    <div>
      <Link href="/dashboard/shipments" className="text-sm text-muted hover:text-ink">
        ← Back to shipments
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{shipment.supplierName}</h1>
            <span className="rounded-md bg-brand-100 px-2 py-1 font-mono text-sm font-semibold text-ink">
              {shipment.code}
            </span>
            {shipment.poNumber &&
              (shipment.purchaseOrderId ? (
                <Link
                  href={`/dashboard/orders/${shipment.purchaseOrderId}`}
                  className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700 hover:bg-slate-200"
                >
                  {shipment.poNumber} ↗
                </Link>
              ) : (
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700">
                  {shipment.poNumber}
                </span>
              ))}
            {shipment.manuallyAdded && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                manually added
              </span>
            )}
            {eta &&
              now > eta &&
              allBoxes.some((b) => !["DELIVERED", "ADDED_IN_STOCK", "LOST", "DAMAGED"].includes(b.status)) && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                  🚨 OVERDUE
                </span>
              )}
          </div>
          <p className="mt-1 text-sm text-muted">
            📅 Shipped {shipment.shipmentDate.toISOString().slice(0, 10)}
            {eta ? ` · 🎯 ETA ${eta.toISOString().slice(0, 10)}` : ""} · 📦 {allBoxes.length} boxes ·{" "}
            {totalUnits} units
            {shipment.supplierEmail ? ` · ✉️ ${shipment.supplierEmail}` : ""}
          </p>
          {shipment.notes && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              📝 {shipment.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/shipments/${shipment.id}/labels`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            🏷️ Box labels (PDF)
          </a>
          <DeleteShipmentButton id={shipment.id} code={shipment.code} />
        </div>
      </div>

      <div className="space-y-6">
        {shipment.lines.map((line) => {
          const expectedUnits = line.boxCount * line.unitsPerBox;
          const receivedUnits = line.boxes.reduce((s, b) => s + (b.unitsReceived ?? 0), 0);
          const receivedBoxes = line.boxes.filter(
            (b) => b.status === "DELIVERED" || b.status === "ADDED_IN_STOCK"
          ).length;
          const anyDiscrepancy = line.boxes.some((b) => b.hasDiscrepancy);
          return (
            <section key={line.id} className="card overflow-hidden">
              {/* Line header (the plan) */}
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 p-4">
                {line.productImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={line.productImage}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{line.productName}</div>
                  <div className="text-xs text-muted">
                    {line.productSku ? `${line.productSku} · ` : ""}
                    {CARRIER_LABEL[line.carrier]} · {METHOD_LABEL[line.shippingMethod]} · 🔖{" "}
                    {line.trackingPerBox ? "tracking per box" : line.trackingNumber}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">
                    {receivedBoxes}/{line.boxCount} boxes received
                  </div>
                  <div className="text-xs text-muted">
                    {receivedUnits}/{expectedUnits} units{" "}
                    {anyDiscrepancy && <span className="font-semibold text-red-600">· ⚠ check</span>}
                  </div>
                </div>
                <LineEditor
                  shipmentId={shipment.id}
                  lineId={line.id}
                  boxCount={line.boxCount}
                  unitsPerBox={line.unitsPerBox}
                  trackingNumber={line.trackingNumber}
                  trackingPerBox={line.trackingPerBox}
                />
              </div>

              {/* Boxes in this line */}
              <div className="divide-y divide-slate-100">
                {line.boxes.map((box) => (
                  <div key={box.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-ink">
                            {box.boxCode}
                          </span>
                          <StatusBadge status={box.status} />
                          {box.hasDiscrepancy && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              ⚠ Discrepancy
                            </span>
                          )}
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm text-muted sm:grid-cols-3">
                          <span className="col-span-2 sm:col-span-3">
                            {box.trackingNumber ? (
                              (() => {
                                const url = trackingUrl(box.carrier, box.trackingNumber);
                                const label = `🔖 ${CARRIER_LABEL[box.carrier]} · ${box.trackingNumber}`;
                                return url ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono text-blue-600 hover:underline"
                                  >
                                    {label} ↗
                                  </a>
                                ) : (
                                  <span className="font-mono text-ink">{label}</span>
                                );
                              })()
                            ) : (
                              <span className="text-red-600">
                                No tracking number — contact supplier
                              </span>
                            )}
                          </span>
                          {(box.status === "IN_TRANSIT" || box.status === "DELAYED") && (
                            <span className="col-span-2 sm:col-span-3">
                              {(() => {
                                const d = daysSince(shipment.shipmentDate, now);
                                return (
                                  <span
                                    className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${SEV_CLASS[transitSeverity(d)]}`}
                                  >
                                    ⏱ {d} day{d === 1 ? "" : "s"} in transit
                                  </span>
                                );
                              })()}
                            </span>
                          )}
                          <span>Units: {box.unitsPerBox}</span>
                          <span>
                            Weight: {box.weightOfBox} lbs / {(box.weightOfBox / 2.20462).toFixed(2)} kg
                          </span>
                          {box.weightReceived != null && (
                            <span>Got: {box.weightReceived} lbs</span>
                          )}
                          {box.unitsReceived != null && (
                            <span>Units in: {box.unitsReceived}</span>
                          )}
                          {box.condition && (
                            <span>
                              {box.condition === "GOOD" ? "✅ Good" : "❗ Lost units"}
                            </span>
                          )}
                          {box.lastCarrierStatus && (
                            <span className="col-span-2">📡 {box.lastCarrierStatus}</span>
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

                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <div className="mb-1 text-xs font-medium text-slate-500">
                        📸 Photos (damage / lost-units evidence)
                      </div>
                      <PhotoUpload boxId={box.id} photos={box.photos} />
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
            </section>
          );
        })}
      </div>
    </div>
  );
}
