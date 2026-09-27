// Fuzzy matcher between tracker products and Shopify variants, for the
// auto-link assistant. Pure logic so it's unit-testable against real names.

export type MatchProduct = { id: string; name: string; sku: string | null };
export type MatchVariant = {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
};
export type Suggestion = {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  score: number;
  reason: string;
};

const COLORS = new Set([
  "black", "white", "silver", "gray", "grey", "blue", "navy", "red", "orange",
  "green", "brown", "yellow", "gold", "camo", "wine", "pink", "purple",
]);
const STOPWORDS = new Set(["the", "for", "of", "and", "a", "an", "with", "pack", "2x", "3x", "x"]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—\-_/·,.()[\]#&+!’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t && !STOPWORDS.has(t)));
}

function colorsOf(t: Set<string>): Set<string> {
  return new Set([...t].filter((x) => COLORS.has(x)));
}

export function variantLabelOf(v: MatchVariant): string {
  return v.variantTitle && v.variantTitle !== "Default Title"
    ? `${v.productTitle} – ${v.variantTitle}`
    : v.productTitle;
}

// Score 0..1 for one pair, or 0 when disqualified (conflicting colors).
export function matchScore(p: MatchProduct, v: MatchVariant): { score: number; reason: string } {
  const vLabel = variantLabelOf(v);
  if (p.sku && v.sku && normalize(p.sku) === normalize(v.sku)) {
    return { score: 1, reason: "same SKU" };
  }
  if (normalize(p.name) === normalize(vLabel)) {
    return { score: 0.98, reason: "identical name" };
  }
  const a = tokens(p.name);
  const b = tokens(vLabel);
  if (a.size === 0 || b.size === 0) return { score: 0, reason: "" };

  // A color named on both sides must agree — "Edge (Silver)" must never pair
  // with "Edge – Phantom Black".
  const ca = colorsOf(a);
  const cb = colorsOf(b);
  if (ca.size > 0 && cb.size > 0 && ![...ca].some((c) => cb.has(c))) {
    return { score: 0, reason: "" };
  }

  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const containment = inter / Math.min(a.size, b.size);
  const jaccard = inter / (a.size + b.size - inter);
  const colorBonus = ca.size > 0 && cb.size > 0 ? 0.05 : 0;
  const score = Math.min(0.97, containment * 0.65 + jaccard * 0.3 + colorBonus);
  return { score, reason: `similar name (${Math.round(score * 100)}%)` };
}

// Greedy 1:1 assignment of unlinked products to unlinked variants, best
// scores first. Only pairs at or above `threshold` are suggested.
export function suggestLinks(
  products: MatchProduct[],
  variants: MatchVariant[],
  threshold = 0.55
): Suggestion[] {
  const pairs: (Suggestion & { s: number })[] = [];
  for (const p of products) {
    for (const v of variants) {
      const { score, reason } = matchScore(p, v);
      if (score >= threshold) {
        pairs.push({
          productId: p.id,
          productName: p.name,
          variantId: v.variantId,
          variantLabel: variantLabelOf(v),
          score,
          reason,
          s: score,
        });
      }
    }
  }
  pairs.sort((x, y) => y.s - x.s);
  const usedP = new Set<string>();
  const usedV = new Set<string>();
  const out: Suggestion[] = [];
  for (const pair of pairs) {
    if (usedP.has(pair.productId) || usedV.has(pair.variantId)) continue;
    usedP.add(pair.productId);
    usedV.add(pair.variantId);
    const { s, ...rest } = pair;
    out.push(rest);
  }
  return out;
}
