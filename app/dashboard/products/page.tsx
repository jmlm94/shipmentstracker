import { prisma } from "@/lib/prisma";
import { CATALOG } from "@/lib/catalog";
import { CsvImport } from "./CsvImport";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const imported = await prisma.product.findMany({ orderBy: { name: "asc" } });
  const usingImported = imported.length > 0;

  // What the supplier form is actually showing right now.
  const shown = usingImported
    ? imported.map((p) => ({ id: p.id, title: p.name, sku: p.sku || "", image: p.image || "" }))
    : CATALOG;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">🛍️ Products</h1>
        <p className="mt-1 text-sm text-muted">
          The catalog suppliers pick from on the smart form.
        </p>
      </div>

      <div className="mb-5">
        <CsvImport />
      </div>

      <div className="mb-3 text-sm text-muted">
        Currently showing <strong>{shown.length}</strong> products ·{" "}
        {usingImported ? "imported from your CSV" : "built-in Sortly snapshot (upload a CSV to override)"}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                —
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">{p.title}</div>
              {p.sku && <div className="truncate text-[11px] text-muted">{p.sku}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
