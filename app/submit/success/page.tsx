import Link from "next/link";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { boxes?: string };
}) {
  const boxes = searchParams.boxes || "your";
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="card w-full p-10">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h1 className="text-xl font-semibold">Shipment submitted</h1>
        <p className="mt-3 text-sm text-muted">
          Thank you. We received <strong>{boxes}</strong> box
          {boxes === "1" ? "" : "es"}. The warehouse team will track each box
          from here. You can close this page.
        </p>
        <div className="mt-8">
          <Link href="/submit" className="btn-secondary">
            Submit another shipment
          </Link>
        </div>
      </div>
    </main>
  );
}
