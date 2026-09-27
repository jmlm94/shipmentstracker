import { describe, expect, it } from "vitest";
import { restockPlan } from "../restock";

const now = new Date("2026-09-27T00:00:00Z");

describe("restockPlan (75-day lead time)", () => {
  it("suggests ordering now when cover is inside the lead time", () => {
    // 10/day, 300 on hand → 30 days of cover < 75-day lead
    const p = restockPlan({ onHand: 300, incoming: 0, unitsSold: 300, windowDays: 30, now });
    expect(p.velocity).toBe(10);
    expect(p.daysOfCover).toBe(30);
    expect(p.urgency).toBe("now");
    // needs (75+90)*10 − 300 = 1350
    expect(p.suggestedQty).toBe(1350);
  });

  it("incoming PO units push the order-by date out", () => {
    // same but 900 incoming → 120 days of cover > 75 → ok
    const p = restockPlan({ onHand: 300, incoming: 900, unitsSold: 300, windowDays: 30, now });
    expect(p.daysOfCover).toBe(120);
    expect(p.urgency).toBe("ok");
    expect(p.daysUntilOrder).toBe(45);
  });

  it("flags 'soon' within 14 days of the order-by date", () => {
    // 10/day, 800 pool → 80 days cover → 5 days until order-by
    const p = restockPlan({ onHand: 800, incoming: 0, unitsSold: 300, windowDays: 30, now });
    expect(p.urgency).toBe("soon");
    expect(Math.round(p.daysUntilOrder!)).toBe(5);
  });

  it("treats negative (oversold) stock as zero cover → order now", () => {
    const p = restockPlan({ onHand: -4567, incoming: 0, unitsSold: 300, windowDays: 30, now });
    expect(p.daysOfCover).toBe(0);
    expect(p.urgency).toBe("now");
    expect(p.suggestedQty).toBe(1650); // full (75+90) days of demand
  });

  it("no sales → idle, no suggestion", () => {
    const p = restockPlan({ onHand: 500, incoming: 0, unitsSold: 0, windowDays: 30, now });
    expect(p.urgency).toBe("no-sales");
    expect(p.suggestedQty).toBe(0);
    expect(p.orderByDate).toBeNull();
  });

  it("order-by date = run-out minus lead", () => {
    const p = restockPlan({ onHand: 1000, incoming: 0, unitsSold: 300, windowDays: 30, now });
    // 100 days cover → run out 2027-01-05, order by 100−75=25d → 2026-10-22
    expect(p.runOutDate!.toISOString().slice(0, 10)).toBe("2027-01-05");
    expect(p.orderByDate!.toISOString().slice(0, 10)).toBe("2026-10-22");
  });
});
