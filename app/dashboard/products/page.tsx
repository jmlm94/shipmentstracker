import { prisma } from "@/lib/prisma";
import { CATALOG } from "@/lib/catalog";
import { CsvImport } from "./CsvImport";
import { ProductRow } from "./ProductRow";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  // Make the catalog editable: if the DB catalog is empty, seed it from the
  // bundled Sortly snapshot so names can be edited and reflected on the form.
  let products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  if (products.length === 0) {
    await prisma.product.createMany({
      data: CATALOG.map((c) => ({
        name: c.title,
        sku: c.sku || null,
        image: c.image || null,
        source: "snapshot",
      })),
    });
    products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">🛍️ Products</h1>
        <p className="mt-1 text-sm text-muted">
          The catalog suppliers pick from on the smart form. Edit a name below and
          it updates everywhere — including the supplier form.
        </p>
      </div>

      <div className="mb-5">
        <CsvImport />
      </div>

      <div className="mb-3 text-sm text-muted">
        {products.length} products · click the ✏️ to rename one (changes show on the
        supplier form too).
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductRow key={p.id} id={p.id} name={p.name} sku={p.sku || ""} image={p.image || ""} />
        ))}
      </div>
    </div>
  );
}
