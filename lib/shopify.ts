// Shopify Admin API client for the app's own integration (independent of any
// Claude connector). Configure in Vercel:
//   SHOPIFY_STORE_DOMAIN  e.g. "carbinox-co.myshopify.com" (the .myshopify.com domain)
//   SHOPIFY_ADMIN_TOKEN   Admin API access token of a custom app with
//                         read_products + read_orders scopes
const API_VERSION = "2025-01";

export function shopifyConfigured(): boolean {
  return !!(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN);
}

// Accept the domain however it was pasted: with https://, a path, trailing
// slash, or stray whitespace.
function storeDomain(): string {
  return (process.env.SHOPIFY_STORE_DOMAIN || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const domain = storeDomain();
  let res: Response;
  try {
    res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": (process.env.SHOPIFY_ADMIN_TOKEN || "").trim(),
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
  } catch (e) {
    const cause = e instanceof Error && e.cause ? ` (${String((e.cause as Error).message || e.cause)})` : "";
    throw new Error(`Couldn't reach https://${domain}${cause} — check SHOPIFY_STORE_DOMAIN.`);
  }
  if (!res.ok) throw new Error(`Shopify API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (data.errors?.length) throw new Error(`Shopify GraphQL: ${JSON.stringify(data.errors).slice(0, 300)}`);
  return data.data as T;
}

export type ShopifyVariant = {
  variantId: string; // gid://shopify/ProductVariant/...
  productTitle: string;
  variantTitle: string; // "Default Title" for single-variant products
  sku: string;
  price: number;
  inventory: number;
  image: string;
  status: string;
};

// Every product + variant in the store except ARCHIVED ones. UNLISTED counts
// as sellable (direct-link products like the Rogue Pro Founders Pack still
// take orders), so it shows alongside ACTIVE and DRAFT.
export async function listStoreVariants(): Promise<ShopifyVariant[]> {
  const out: ShopifyVariant[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10; page++) {
    const data: any = await gql(
      `query($after: String) {
        products(first: 100, after: $after, sortKey: TITLE) {
          pageInfo { hasNextPage endCursor }
          nodes {
            title status
            featuredMedia { preview { image { url } } }
            variants(first: 50) {
              nodes { id title sku price inventoryQuantity }
            }
          }
        }
      }`,
      { after: cursor }
    );
    for (const p of data.products.nodes) {
      if (p.status === "ARCHIVED") continue;
      const image = p.featuredMedia?.preview?.image?.url || "";
      for (const v of p.variants.nodes) {
        out.push({
          variantId: v.id,
          productTitle: p.title,
          variantTitle: v.title || "",
          sku: v.sku || "",
          price: Number(v.price) || 0,
          inventory: v.inventoryQuantity ?? 0,
          image,
          status: p.status,
        });
      }
    }
    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }
  return out;
}

// Current inventory for specific variants.
export async function fetchVariantInventory(
  variantIds: string[]
): Promise<Map<string, { inventory: number; price: number }>> {
  const map = new Map<string, { inventory: number; price: number }>();
  for (let i = 0; i < variantIds.length; i += 100) {
    const data: any = await gql(
      `query($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant { id inventoryQuantity price }
        }
      }`,
      { ids: variantIds.slice(i, i + 100) }
    );
    for (const n of data.nodes) {
      if (n?.id) map.set(n.id, { inventory: n.inventoryQuantity ?? 0, price: Number(n.price) || 0 });
    }
  }
  return map;
}

// Units sold per (variantId, YYYY-MM-DD) since `sinceISO`, from order line
// items. Paginates orders newest-first until the window is covered; capped at
// `maxOrders` per call — the daily sync only ever needs a day or two.
export async function fetchSalesByDay(
  sinceISO: string,
  maxOrders = 12000
): Promise<Map<string, Map<string, number>>> {
  const sales = new Map<string, Map<string, number>>();
  let cursor: string | null = null;
  let seen = 0;
  while (seen < maxOrders) {
    const data: any = await gql(
      `query($after: String, $q: String!) {
        orders(first: 50, after: $after, query: $q, sortKey: CREATED_AT, reverse: true) {
          pageInfo { hasNextPage endCursor }
          nodes {
            createdAt
            cancelledAt
            lineItems(first: 50) {
              nodes { quantity variant { id } }
            }
          }
        }
      }`,
      { after: cursor, q: `created_at:>='${sinceISO}'` }
    );
    for (const o of data.orders.nodes) {
      seen++;
      if (o.cancelledAt) continue;
      const day = String(o.createdAt).slice(0, 10);
      for (const li of o.lineItems.nodes) {
        const vid = li.variant?.id;
        if (!vid) continue;
        const perDay = sales.get(vid) || new Map<string, number>();
        perDay.set(day, (perDay.get(day) || 0) + (li.quantity || 0));
        sales.set(vid, perDay);
      }
    }
    if (!data.orders.pageInfo.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
  }
  return sales;
}
