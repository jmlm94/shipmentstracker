import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { shopifyConfigured } from "@/lib/shopify";
import { ShopifyLinker } from "@/components/ShopifyLinker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shopify · Shipments Tracker" };

export default async function ShopifyPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true, shopifyVariantId: true },
  });

  return (
    <div>
      <Link href="/dashboard/products" className="text-sm text-muted hover:text-ink">
        ← Back to products
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-semibold">🛒 Shopify</h1>
        <p className="mt-1 text-sm text-muted">
          Import store products into the tracker and link each product to the Shopify variant
          it&apos;s sold as — that powers the <Link href="/dashboard/restock" className="text-blue-600 hover:underline">Restock planner</Link>.
        </p>
      </div>

      {!shopifyConfigured() ? (
        <div className="card max-w-2xl p-6 text-sm">
          <h2 className="mb-2 font-semibold">⚙️ One-time setup needed</h2>
          <p className="mb-3 text-muted">
            The app connects to your store with its own API token. In Shopify admin:
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-muted">
            <li>
              <strong className="text-ink">Settings → Apps and sales channels → Develop apps</strong> →
              Create an app (name it e.g. &quot;Shipments Tracker&quot;).
            </li>
            <li>
              Under <strong className="text-ink">Configuration → Admin API integration</strong>, enable the
              scopes <code className="rounded bg-slate-100 px-1">read_products</code> and{" "}
              <code className="rounded bg-slate-100 px-1">read_orders</code>, then install the app.
            </li>
            <li>
              Copy the <strong className="text-ink">Admin API access token</strong> (starts with{" "}
              <code className="rounded bg-slate-100 px-1">shpat_</code>).
            </li>
            <li>
              In Vercel → the project → <strong className="text-ink">Settings → Environment Variables</strong>, add{" "}
              <code className="rounded bg-slate-100 px-1">SHOPIFY_STORE_DOMAIN</code> (your{" "}
              <code className="rounded bg-slate-100 px-1">*.myshopify.com</code> domain) and{" "}
              <code className="rounded bg-slate-100 px-1">SHOPIFY_ADMIN_TOKEN</code>, then redeploy.
            </li>
          </ol>
        </div>
      ) : (
        <ShopifyLinker products={products} />
      )}
    </div>
  );
}
