import { describe, expect, it } from "vitest";
import { matchScore, suggestLinks } from "../matchProducts";

// Real Carbinox names: tracker catalog vs Shopify store titles.
const edgeSilver = { id: "p1", name: "Carbinox Edge (Silver)", sku: null };
const edgeBlack = { id: "p2", name: "Carbinox Edge (Black)", sku: null };
const bandV2 = { id: "p3", name: "Black Metal Band Pro V2", sku: "blackmetalbandv2" };
const backpack = { id: "p4", name: "Carbinox Tactical Backpack", sku: null };
const wallet = { id: "p5", name: "Carbinox Wallet Pro", sku: null };

const vEdgeBlack = {
  variantId: "v1",
  productTitle: "Carbinox Edge – Ultra Rugged Smartwatch",
  variantTitle: "Phantom Black",
  sku: "",
};
const vEdgeSilver = {
  variantId: "v2",
  productTitle: "Carbinox Edge – Ultra Rugged Smartwatch",
  variantTitle: "Armor Silver",
  sku: "",
};
const vBand = {
  variantId: "v3",
  productTitle: "Black Metal Band Pro V2 & ToolKit [22mm]",
  variantTitle: "Default Title",
  sku: "blackmetalbandv2",
};
const vBackpack = {
  variantId: "v4",
  productTitle: "Carbinox Tactical Backpack",
  variantTitle: "Default Title",
  sku: "carbinoxbackpack",
};
const vSpeaker = {
  variantId: "v5",
  productTitle: "Carbinox Speaker",
  variantTitle: "Default Title",
  sku: "crbnxspkr",
};

describe("matchScore", () => {
  it("SKU equality wins outright", () => {
    expect(matchScore(bandV2, vBand)).toEqual({ score: 1, reason: "same SKU" });
  });

  it("identical normalized names score ~1", () => {
    expect(matchScore(backpack, vBackpack).score).toBeGreaterThanOrEqual(0.98);
  });

  it("colors must agree: Silver never pairs with Phantom Black", () => {
    expect(matchScore(edgeSilver, vEdgeBlack).score).toBe(0);
    expect(matchScore(edgeBlack, vEdgeSilver).score).toBe(0);
  });

  it("color + model tokens match across different phrasings", () => {
    expect(matchScore(edgeSilver, vEdgeSilver).score).toBeGreaterThanOrEqual(0.55);
    expect(matchScore(edgeBlack, vEdgeBlack).score).toBeGreaterThanOrEqual(0.55);
  });

  it("unrelated products stay below threshold", () => {
    expect(matchScore(wallet, vSpeaker).score).toBeLessThan(0.55);
  });
});

describe("suggestLinks", () => {
  it("assigns 1:1, best pairs first, nothing reused", () => {
    const out = suggestLinks(
      [edgeSilver, edgeBlack, bandV2, backpack, wallet],
      [vEdgeBlack, vEdgeSilver, vBand, vBackpack, vSpeaker]
    );
    const byProduct = Object.fromEntries(out.map((s) => [s.productId, s.variantId]));
    expect(byProduct["p1"]).toBe("v2"); // Silver → Armor Silver
    expect(byProduct["p2"]).toBe("v1"); // Black → Phantom Black
    expect(byProduct["p3"]).toBe("v3"); // SKU match
    expect(byProduct["p4"]).toBe("v4"); // exact name
    expect(byProduct["p5"]).toBeUndefined(); // wallet has no counterpart offered
    const variantIds = out.map((s) => s.variantId);
    expect(new Set(variantIds).size).toBe(variantIds.length);
  });
});
