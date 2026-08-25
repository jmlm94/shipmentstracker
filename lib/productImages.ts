import { prisma } from "./prisma";
import { CATALOG } from "./catalog";

// PO items, shipment lines, and boxes snapshot the product image at creation
// time — rows created before a product got its image carry "" forever (e.g.
// Carbinox Edge Silver). This resolver fixes that at render time: the stored
// image wins, else the product's CURRENT image from the imported products
// table or the bundled catalog, matched by product id or (fallback) name.
export type ImageResolver = (
  productId: string | null | undefined,
  stored: string | null | undefined,
  name?: string | null
) => string;

export async function getProductImageResolver(): Promise<ImageResolver> {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const c of CATALOG) {
    if (c.image) {
      byId.set(c.id, c.image);
      byName.set(c.title.trim().toLowerCase(), c.image);
    }
  }
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, image: true },
    });
    for (const p of products) {
      if (p.image) {
        byId.set(p.id, p.image);
        byName.set(p.name.trim().toLowerCase(), p.image);
      }
    }
  } catch {
    // resolver still works from the bundled catalog alone
  }
  return (productId, stored, name) =>
    stored ||
    (productId ? byId.get(productId) : "") ||
    (name ? byName.get(name.trim().toLowerCase()) : "") ||
    "";
}
