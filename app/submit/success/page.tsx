import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { boxes?: string; code?: string; id?: string };
}) {
  const id = searchParams.id;
  const shipment = id
    ? await prisma.shipment.findUnique({
        where: { id },
        include: { _count: { select: { boxes: true } }, boxes: { select: { unitsPerBox: true } } },
      })
    : null;

  const code = shipment?.code || searchParams.code;
  const boxes = shipment?._count.boxes ?? Number(searchParams.boxes || 0);
  const units = shipment?.boxes.reduce((s, b) => s + b.unitsPerBox, 0) ?? 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-10 text-center">
      <div className="card w-full p-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          🎉
        </div>
        <h1 className="text-xl font-semibold">Your shipment has been submitted!</h1>

        {code && (
          <div className="mx-auto mt-4 inline-block rounded-lg bg-slate-100 px-5 py-2">
            <div className="text-xs uppercase tracking-wide text-muted">Your shipment ID</div>
            <div className="font-mono text-lg font-semibold">{code}</div>
          </div>
        )}

        {shipment && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-left text-sm sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-2">
              <div className="text-[11px] uppercase text-muted">Supplier</div>
              <div className="truncate font-medium">{shipment.supplierName}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <div className="text-[11px] uppercase text-muted">Date</div>
              <div className="font-medium">{shipment.shipmentDate.toISOString().slice(0, 10)}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <div className="text-[11px] uppercase text-muted">Boxes</div>
              <div className="font-medium">{boxes}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <div className="text-[11px] uppercase text-muted">Units</div>
              <div className="font-medium">{units}</div>
            </div>
          </div>
        )}

        {id && (
          <div className="mt-6 rounded-xl border-2 border-brand-200 bg-brand-50 p-5">
            <div className="text-2xl">🏷️</div>
            <h2 className="mt-1 font-semibold text-ink">Download your box labels</h2>
            <p className="mt-1 text-sm text-ink">
              Print these labels and attach one to each box before handing off to the
              carrier. Each box has its own QR code so we can track it on arrival.
            </p>
            <a
              href={`/api/shipments/${id}/labels`}
              target="_blank"
              rel="noreferrer"
              className="btn mt-3 inline-block bg-ink hover:bg-carbon"
            >
              📄 Download Box Labels (PDF)
            </a>
          </div>
        )}

        <div className="mt-8">
          <Link href="/submit" className="btn-secondary">
            Submit another shipment
          </Link>
        </div>
      </div>
    </main>
  );
}
