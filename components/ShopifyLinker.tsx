"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";

type StoreVariant = {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  price: number;
  inventory: number;
  image: string;
  status: string;
};
type TrackerProduct = { id: string; name: string; sku: string | null; shopifyVariantId: string | null };

function variantLabel(v: StoreVariant): string {
  const name =
    v.variantTitle && v.variantTitle !== "Default Title"
      ? `${v.productTitle} – ${v.variantTitle}`
      : v.productTitle;
  return v.sku ? `${name} (${v.sku})` : name;
}

// Import Shopify variants as tracker products, and link existing tracker
// products to store variants — all by variant (many Carbinox variants have no
// SKU, so SKU alone can't be the key).
export function ShopifyLinker({ products }: { products: TrackerProduct[] }) {
  const router = useRouter();
  const [variants, setVariants] = useState<StoreVariant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/shopify/products")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
        setVariants(d.variants);
      })
      .catch((e) => setError(String(e.message || e)));
  }, []);

  const linkedIds = useMemo(
    () => new Set(products.map((p) => p.shopifyVariantId).filter(Boolean) as string[]),
    [products]
  );
  const unimported = useMemo(
    () =>
      (variants || []).filter(
        (v) =>
          !linkedIds.has(v.variantId) &&
          (query.trim() === "" ||
            variantLabel(v).toLowerCase().includes(query.trim().toLowerCase()))
      ),
    [variants, linkedIds, query]
  );

  async function importSelected() {
    const list = (variants || []).filter((v) => checked.has(v.variantId));
    if (list.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/shopify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variants: list }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(d.error || "Import failed.", "error");
        return;
      }
      toast(`Added ${d.created} product${d.created === 1 ? "" : "s"}${d.skipped ? ` (${d.skipped} already linked)` : ""}. ✅`, "success");
      setChecked(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function link(productId: string, variantId: string) {
    const v = (variants || []).find((x) => x.variantId === variantId);
    const res = await fetch("/api/shopify/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        v
          ? { productId, variantId, sku: v.sku, price: v.price, inventory: v.inventory }
          : { productId, variantId: null }
      ),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(d.error || "Couldn't save the link.", "error");
      return;
    }
    toast(v ? "Linked. ✅" : "Unlinked.", "success");
    router.refresh();
  }

  if (error) {
    return <div className="card p-6 text-sm text-red-600">{error}</div>;
  }
  if (!variants) {
    return <div className="card p-6 text-sm text-muted">Loading your Shopify catalog…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Link existing tracker products */}
      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          🔗 Link your products to Shopify
        </h2>
        <p className="mb-4 text-xs text-muted">
          Pick which store variant each product is sold as. Linked products get sales velocity,
          live stock, and reorder dates on the Restock page.
        </p>
        <div className="space-y-1.5">
          {products.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">
                {p.name}
                {p.sku ? <span className="ml-1 text-xs text-muted">· {p.sku}</span> : null}
              </span>
              <select
                className="input max-w-xs py-1.5 text-xs"
                value={p.shopifyVariantId || ""}
                onChange={(e) => link(p.id, e.target.value)}
              >
                <option value="">— not linked —</option>
                {variants.map((v) => (
                  <option key={v.variantId} value={v.variantId}>
                    {variantLabel(v)}
                    {v.status !== "ACTIVE" ? ` [${v.status.toLowerCase()}]` : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Import new products from the store */}
      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            🛒 Add Shopify products to the tracker
          </h2>
          <button onClick={importSelected} disabled={busy || checked.size === 0} className="btn">
            {busy ? "Adding…" : `Add ${checked.size || ""} selected`}
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">
          Only the ones you pick are added — they arrive already linked to their store variant.
        </p>
        <input
          className="input mb-3 max-w-sm"
          placeholder="Filter by name or SKU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-[28rem] space-y-1 overflow-auto">
          {unimported.length === 0 && (
            <p className="py-4 text-sm text-muted">Every matching store variant is already linked.</p>
          )}
          {unimported.map((v) => (
            <label
              key={v.variantId}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={checked.has(v.variantId)}
                onChange={(e) => {
                  const next = new Set(checked);
                  if (e.target.checked) next.add(v.variantId);
                  else next.delete(v.variantId);
                  setChecked(next);
                }}
              />
              {v.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.image} alt="" className="h-9 w-9 rounded-md border border-slate-200 object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100">📦</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {variantLabel(v)}
                  {v.status !== "ACTIVE" && (
                    <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                      {v.status.toLowerCase()}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted">
                  ${v.price.toFixed(2)} · {v.inventory} in stock
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
