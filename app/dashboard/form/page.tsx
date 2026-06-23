import { headers } from "next/headers";
import Link from "next/link";
import { CopyField } from "@/components/CopyField";

export const dynamic = "force-dynamic";

const FIELDS = [
  { group: "Shipment (filled once)", items: [
    "Supplier name",
    "Supplier email (optional)",
    "Shipment date",
    "Carrier — FedEx / DHL / UPS",
    "Method — Air / Sea",
    "Notes (optional)",
  ] },
  { group: "Each box (one row per box)", items: [
    "Product ID / SKU",
    "Product name (optional)",
    "Tracking number — unique per box",
    "Units in the box",
    "Weight of the box (lbs)",
  ] },
];

export default function FormTemplatePage() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "your-app.vercel.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const link = `${proto}://${host}/submit`;

  const message = `Hi! Every time you ship to our warehouse, please fill out this short form — one row per box, with each box's tracking number, SKU, unit count, and weight. Be exact: we verify every box on arrival.

${link}

Thank you!`;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Smart form</h1>
        <p className="mt-1 text-sm text-muted">
          This is the form your suppliers fill in for every shipment. Share the
          link below — it never changes, so you can reuse it with every supplier.
        </p>
      </div>

      <section className="card mb-5 p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Shareable link
        </h2>
        <CopyField value={link} />
        <div className="mt-3">
          <Link href="/submit" target="_blank" className="btn-secondary">
            Open / preview the form ↗
          </Link>
        </div>
      </section>

      <section className="card mb-5 p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Ready-to-send message
        </h2>
        <p className="mb-3 text-sm text-muted">
          Paste this into email or WhatsApp when you send the link.
        </p>
        <CopyField value={message} multiline />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          What the form collects
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {FIELDS.map((g) => (
            <div key={g.group}>
              <div className="mb-2 text-sm font-medium">{g.group}</div>
              <ul className="space-y-1 text-sm text-muted">
                {g.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
          Every field is required and validated. Duplicate tracking numbers are
          rejected automatically, so each box is guaranteed to be unique.
        </p>
      </section>
    </div>
  );
}
