import { describe, expect, it } from "vitest";
import { nextReceivedTotals, type ReceivedItemState } from "../receiving";

function item(over: Partial<ReceivedItemState>): ReceivedItemState {
  return {
    id: "i1",
    productId: "p1",
    productName: "Product",
    quantity: 100,
    receivedQty: 0,
    receivedFromBoxes: 0,
    ...over,
  };
}

describe("nextReceivedTotals", () => {
  it("adds box deliveries ON TOP of manual receipts (PO-0001 regression)", () => {
    // 4,016 recorded by hand, then 2,000 arrive in tracked boxes → 6,016.
    const items = [
      item({ id: "edge", productId: "edge-black", quantity: 15376, receivedQty: 4016 }),
      item({ id: "blaze", productId: "blaze-r", quantity: 8201, receivedQty: 3338 }),
    ];
    const derived = new Map([
      ["edge-black", 2000],
      ["blaze-r", 2000],
    ]);
    const next = nextReceivedTotals(items, derived, "add");
    expect(next.find((n) => n.id === "edge")!.receivedQty).toBe(6016);
    expect(next.find((n) => n.id === "blaze")!.receivedQty).toBe(5338);
  });

  it("replaces the box component instead of double-counting on re-sync", () => {
    // Boxes already credited 2,000 (receivedFromBoxes=2000). Re-running the
    // sync with the same boxes must NOT add another 2,000.
    const items = [
      item({ quantity: 15376, receivedQty: 6016, receivedFromBoxes: 2000 }),
    ];
    const next = nextReceivedTotals(items, new Map([["p1", 2000]]), "add");
    expect(next[0].receivedQty).toBe(6016);
  });

  it("grows when more boxes deliver", () => {
    const items = [item({ quantity: 15376, receivedQty: 6016, receivedFromBoxes: 2000 })];
    const next = nextReceivedTotals(items, new Map([["p1", 3500]]), "add");
    expect(next[0].receivedQty).toBe(7516); // 4016 manual + 3500 boxes
    expect(next[0].receivedFromBoxes).toBe(3500);
  });

  it("keeps a manual downward correction", () => {
    // Warehouse corrected the total down by 100 (5916), box component 2000
    // unchanged → re-sync keeps 5916.
    const items = [item({ quantity: 15376, receivedQty: 5916, receivedFromBoxes: 2000 })];
    const next = nextReceivedTotals(items, new Map([["p1", 2000]]), "add");
    expect(next[0].receivedQty).toBe(5916);
  });

  it("follows box-level corrections down", () => {
    // A box's count was corrected 2000 → 1995.
    const items = [item({ quantity: 15376, receivedQty: 6016, receivedFromBoxes: 2000 })];
    const next = nextReceivedTotals(items, new Map([["p1", 1995]]), "add");
    expect(next[0].receivedQty).toBe(6011);
  });

  it("caps at the ordered quantity", () => {
    const items = [item({ quantity: 100, receivedQty: 90 })];
    const next = nextReceivedTotals(items, new Map([["p1", 50]]), "add");
    expect(next[0].receivedQty).toBe(100);
  });

  it("'set' mode makes the total match the boxes exactly", () => {
    const items = [item({ quantity: 100, receivedQty: 80, receivedFromBoxes: 10 })];
    const next = nextReceivedTotals(items, new Map([["p1", 60]]), "set");
    expect(next[0].receivedQty).toBe(60);
    expect(next[0].receivedFromBoxes).toBe(60);
  });

  it("items with no boxes keep their manual counts", () => {
    const items = [item({ quantity: 5000, receivedQty: 2000 })];
    const next = nextReceivedTotals(items, new Map(), "add");
    expect(next[0].receivedQty).toBe(2000);
  });
});
