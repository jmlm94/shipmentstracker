import { headers } from "next/headers";
import Link from "next/link";
import { CopyField } from "@/components/CopyField";

export const dynamic = "force-dynamic";

const FIELDS = [
  { group: "Shipment (filled once)", items: [
    "Supplier name",
    "Email address",
    "Shipment date",
    "Notes (optional)",
  ] },
  { group: "Each product / SKU (one row per SKU)", items: [
    "Product — picked from the Carbinox catalog (with image)",
    "Number of boxes",
    "Units per box",
    "Weight per box (lbs)",
    "Shipping method — Air or Sea (one per SKU)",
    "Carrier — UPS / FedEx / USPS / DHL / Others",
    "Tracking number",
  ] },
];

export default function FormTemplatePage() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "your-app.vercel.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const link = `${proto}://${host}/submit`;

  const message = `Hi! Every time you ship to our warehouse, please fill out this short form — one row per product (SKU): pick the product, then enter the number of boxes, units per box, weight per box, shipping method, carrier and tracking number. After submitting you'll get a PDF of box labels — print and stick one on each box before shipping. Be exact: we verify every box on arrival.

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
          Every field is required and validated. Each SKU line is expanded into
          individual boxes, and every box gets its own QR-coded label so it can
          be tracked and checked on arrival.
        </p>
      </section>
    </div>
  );
}
