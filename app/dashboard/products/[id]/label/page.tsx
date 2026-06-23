import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = { A: "A", B: "B", C: "C" };

export default async function LabelPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();

  // QR encodes the SKU so any scanner (Sortly, phone) reads the product id.
  const qrSvg = await QRCode.toString(product.sku, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/dashboard/products" className="text-sm text-muted hover:text-ink">
          ← Back to products
        </Link>
        <PrintButton />
      </div>

      <p className="mb-4 text-sm text-muted print:hidden">
        Send this label to your supplier. They print it and stick one on{" "}
        <strong>every box</strong> of this SKU, writing the unit count in the box.
        Sized 4×6.
      </p>

      {/* The label itself — 4in x 6in. */}
      <div
        className="label-sheet mx-auto flex flex-col items-center justify-between border border-slate-300 bg-white p-6 text-center"
        style={{ width: "4in", height: "6in" }}
      >
        <div className="w-full">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Tier {TIER_LABEL[product.tier]}
          </div>
          <h2 className="mt-1 text-2xl font-bold leading-tight">{product.name}</h2>
          <div className="mt-1 font-mono text-lg">{product.sku}</div>
        </div>

        <div
          className="my-2 h-[2.4in] w-[2.4in]"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />

        <div className="w-full">
          <div className="text-sm font-semibold">Number of units in this box</div>
          <div className="mx-auto mt-1 h-12 w-3/4 rounded border-2 border-slate-800" />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body { background: white; }
            header, .print\\:hidden { display: none !important; }
            .label-sheet { border: none !important; margin: 0 !important; }
            @page { size: 4in 6in; margin: 0; }
          }
        `,
        }}
      />
    </div>
  );
}
