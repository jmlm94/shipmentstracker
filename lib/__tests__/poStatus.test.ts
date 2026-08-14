import { describe, expect, it } from "vitest";
import { unifyCosts, money, poFinancials, itemLandedUnitCost } from "../poStatus";

describe("unifyCosts", () => {
  it("returns cost rows sorted by sort order", () => {
    const rows = unifyCosts({
      costs: [
        { kind: "OTHER", label: "Customs", amount: 50, sort: 1 },
        { kind: "SHIPPING", label: "Sea freight", amount: 200, sort: 0 },
      ],
    });
    expect(rows.map((r) => r.label)).toEqual(["Sea freight", "Customs"]);
  });

  it("handles missing/empty costs", () => {
    expect(unifyCosts({})).toEqual([]);
    expect(unifyCosts({ costs: null })).toEqual([]);
    expect(unifyCosts({ costs: [] })).toEqual([]);
  });

  it("keeps credits negative", () => {
    const rows = unifyCosts({ costs: [{ kind: "OTHER", label: "Credit", amount: -75, sort: 0 }] });
    expect(rows[0].amount).toBe(-75);
  });
});

describe("poFinancials", () => {
  const items = [
    { quantity: 100, unitCost: 10 }, // 1000
    { quantity: 50, unitCost: 20 }, // 1000
  ];
  const costs = [{ amount: 300 }, { amount: -50 }]; // net 250, no shipping

  it("computes subtotal, costs, total, landed unit cost", () => {
    const fin = poFinancials(items, costs);
    expect(fin.subtotal).toBe(2000);
    expect(fin.costsTotal).toBe(250);
    expect(fin.total).toBe(2250);
    expect(fin.orderedUnits).toBe(150);
    expect(fin.landedUnitCost).toBeCloseTo(2250 / 150);
  });

  it("computes paid and balance (ignoring unread amounts)", () => {
    const fin = poFinancials(items, costs, [{ amount: 1000 }, { amount: null }, { amount: 500 }]);
    expect(fin.paid).toBe(1500);
    expect(fin.balance).toBe(750);
  });

  it("flags overpayment as negative balance", () => {
    const fin = poFinancials(items, costs, [{ amount: 3000 }]);
    expect(fin.balance).toBe(-750);
  });

  it("excludes prepaid shipping from the balance but not the total", () => {
    const withShipping = [
      { amount: 300, kind: "SHIPPING" },
      { amount: 100, kind: "OTHER" },
      { amount: -50, kind: "OTHER" },
    ];
    const fin = poFinancials(items, withShipping, [{ amount: 1000 }]);
    expect(fin.total).toBe(2350); // shipping still in the total
    expect(fin.shippingTotal).toBe(300);
    // balance owes goods + other adjustments only: 2000 + 50 − 1000
    expect(fin.balance).toBe(1050);
  });

  it("returns null landed cost when there are no units", () => {
    const fin = poFinancials([], costs);
    expect(fin.landedUnitCost).toBeNull();
  });
});

describe("itemLandedUnitCost", () => {
  it("allocates shared costs proportionally to line value", () => {
    const items = [
      { quantity: 100, unitCost: 10 }, // value 1000 (half)
      { quantity: 50, unitCost: 20 }, // value 1000 (half)
    ];
    const fin = poFinancials(items, [{ amount: 300 }]);
    // Each line absorbs 150 of costs.
    expect(itemLandedUnitCost(items[0], fin)).toBeCloseTo(10 + 150 / 100);
    expect(itemLandedUnitCost(items[1], fin)).toBeCloseTo(20 + 150 / 50);
    // Allocated landed totals reconstruct the PO total.
    const landedTotal =
      itemLandedUnitCost(items[0], fin)! * 100 + itemLandedUnitCost(items[1], fin)! * 50;
    expect(landedTotal).toBeCloseTo(fin.total);
  });

  it("falls back to per-unit allocation when items have no value", () => {
    const items = [
      { quantity: 75, unitCost: 0 },
      { quantity: 25, unitCost: 0 },
    ];
    const fin = poFinancials(items, [{ amount: 100 }]);
    expect(itemLandedUnitCost(items[0], fin)).toBeCloseTo(1);
    expect(itemLandedUnitCost(items[1], fin)).toBeCloseTo(1);
  });

  it("returns null for zero-quantity lines", () => {
    const fin = poFinancials([{ quantity: 0, unitCost: 5 }], []);
    expect(itemLandedUnitCost({ quantity: 0, unitCost: 5 }, fin)).toBeNull();
  });
});

describe("money", () => {
  it("formats USD", () => {
    expect(money(1234.5)).toBe("$1,234.50");
  });
  it("falls back for unknown currencies", () => {
    expect(money(10, "NOPE")).toBe("NOPE 10.00");
  });
});
