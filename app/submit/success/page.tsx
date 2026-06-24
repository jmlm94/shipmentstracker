import Link from "next/link";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { boxes?: string; code?: string; id?: string };
}) {
  const boxes = searchParams.boxes || "your";
  const code = searchParams.code;
  const id = searchParams.id;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="card w-full p-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          🎉
        </div>
        <h1 className="text-xl font-semibold">Shipment submitted!</h1>
        {code && (
          <div className="mx-auto mt-4 inline-block rounded-lg bg-slate-100 px-5 py-2">
            <div className="text-xs uppercase tracking-wide text-muted">Your shipment code</div>
            <div className="font-mono text-lg font-semibold">{code}</div>
          </div>
        )}
        <p className="mt-3 text-sm text-muted">
          Thank you! We received <strong>{boxes}</strong> box
          {boxes === "1" ? "" : "es"}.
        </p>

        {id && (
          <div className="mt-6 rounded-xl border-2 border-orange-200 bg-orange-50 p-5">
            <div className="text-2xl">🏷️</div>
            <h2 className="mt-1 font-semibold text-orange-900">Download your box labels</h2>
            <p className="mt-1 text-sm text-orange-800">
              Print this PDF and stick <strong>one label on each box</strong> before
              shipping. Each box has its own QR code so we can track it on arrival.
            </p>
            <a
              href={`/api/shipments/${id}/labels`}
              target="_blank"
              rel="noreferrer"
              className="btn mt-3 inline-block bg-orange-600 hover:bg-orange-700"
            >
              ⬇️ Download box labels (PDF)
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
