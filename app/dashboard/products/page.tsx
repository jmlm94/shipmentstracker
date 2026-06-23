import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductManager } from "./ProductManager";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  A: "Tier A",
  B: "Tier B",
  C: "Tier C",
};

export default async function ProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { sku: "asc" } });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Products (SKUs)</h1>
        <p className="mt-1 text-sm text-muted">
          Define each SKU once. This powers auto-fill on the supplier form and
          the printable QR box labels.
        </p>
      </div>

      <ProductManager />

      <div className="mt-6 space-y-2">
        {products.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">
            No products yet. Add your first SKU above.
          </div>
        )}
        {products.map((p) => (
          <div key={p.id} className="card flex items-center justify-between p-4">
            <div>
              <div className="font-medium">
                {p.name} <span className="font-mono text-sm text-muted">({p.sku})</span>
              </div>
              <div className="mt-0.5 text-sm text-muted">
                {TIER_LABEL[p.tier]}
                {p.unitsPerBox ? ` · ${p.unitsPerBox} units/box` : ""}
              </div>
            </div>
            <Link href={`/dashboard/products/${p.id}/label`} className="btn-secondary">
              QR label
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
