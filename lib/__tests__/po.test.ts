import { describe, expect, it } from "vitest";
import { statusFromReceived } from "../po";

describe("statusFromReceived", () => {
  it("stays OPEN when nothing is received", () => {
    expect(statusFromReceived([{ quantity: 10, receivedQty: 0 }], "OPEN")).toBe("OPEN");
  });

  it("goes PARTIALLY_RECEIVED on any receipt", () => {
    expect(statusFromReceived([{ quantity: 10, receivedQty: 3 }], "OPEN")).toBe(
      "PARTIALLY_RECEIVED"
    );
  });

  it("goes RECEIVED when every line is fully received", () => {
    expect(
      statusFromReceived(
        [
          { quantity: 10, receivedQty: 10 },
          { quantity: 5, receivedQty: 5 },
        ],
        "PARTIALLY_RECEIVED"
      )
    ).toBe("RECEIVED");
  });

  it("caps over-receipt at the ordered quantity", () => {
    // 12 received of 10 on one line must NOT mark a 15-unit order received.
    expect(
      statusFromReceived(
        [
          { quantity: 10, receivedQty: 12 },
          { quantity: 5, receivedQty: 0 },
        ],
        "OPEN"
      )
    ).toBe("PARTIALLY_RECEIVED");
  });

  it("keeps DRAFT and CANCELLED sticky", () => {
    expect(statusFromReceived([{ quantity: 10, receivedQty: 10 }], "DRAFT")).toBe("DRAFT");
    expect(statusFromReceived([{ quantity: 10, receivedQty: 10 }], "CANCELLED")).toBe("CANCELLED");
  });

  it("treats an empty order as OPEN", () => {
    expect(statusFromReceived([], "OPEN")).toBe("OPEN");
  });
});
