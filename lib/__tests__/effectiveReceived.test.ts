import { describe, expect, it } from "vitest";
import { effectiveReceived, statusFromReceived } from "../po";

// THE RULE: units on the way are on the way — never counted as received.
describe("effectiveReceived", () => {
  it("passes through normal counts", () => {
    expect(effectiveReceived(100, 40, 0)).toBe(40);
    expect(effectiveReceived(100, 40, 60)).toBe(40); // 40 + 60 fits exactly
  });

  it("caps at ordered quantity", () => {
    expect(effectiveReceived(100, 150, 0)).toBe(100);
  });

  it("in-transit units win over inflated received counts", () => {
    // Jose's screenshot: received claims full order while 1400 still in transit.
    expect(effectiveReceived(4303, 4303, 1400)).toBe(2903);
    // received + in-transit exceeds ordered → received gives way
    expect(effectiveReceived(15376, 14016, 9500)).toBe(5876);
  });

  it("never goes negative even when transit exceeds the order", () => {
    expect(effectiveReceived(100, 50, 150)).toBe(0);
  });

  it("consistent rows are unchanged", () => {
    // 3000 received + 7000 on the way on a 10000 order — already consistent.
    expect(effectiveReceived(10000, 3000, 7000)).toBe(3000);
  });
});

describe("statusFromReceived with in-transit units", () => {
  it("never auto-completes while units are on the way", () => {
    const items = [{ quantity: 100, receivedQty: 100, inTransit: 20 }];
    expect(statusFromReceived(items, "OPEN")).toBe("PARTIALLY_RECEIVED");
  });

  it("completes once transit is empty", () => {
    const items = [{ quantity: 100, receivedQty: 100, inTransit: 0 }];
    expect(statusFromReceived(items, "PARTIALLY_RECEIVED")).toBe("RECEIVED");
  });

  it("without inTransit info behaves as before", () => {
    expect(statusFromReceived([{ quantity: 10, receivedQty: 10 }], "OPEN")).toBe("RECEIVED");
    expect(statusFromReceived([{ quantity: 10, receivedQty: 3 }], "OPEN")).toBe(
      "PARTIALLY_RECEIVED"
    );
  });
});
