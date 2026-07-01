import { describe, expect, it } from "vitest";
import { carrierStatusToBoxStatus } from "../status";

describe("carrierStatusToBoxStatus", () => {
  it("maps out_for_delivery BEFORE delivered (regression)", () => {
    // "out_for_delivery" contains "deliver" — must not match DELIVERED.
    expect(carrierStatusToBoxStatus("out_for_delivery")).toBe("OUT_FOR_DELIVERY");
    expect(carrierStatusToBoxStatus("Out for delivery")).toBe("OUT_FOR_DELIVERY");
  });

  it("maps delivered", () => {
    expect(carrierStatusToBoxStatus("delivered")).toBe("DELIVERED");
    expect(carrierStatusToBoxStatus("Package delivered to recipient")).toBe("DELIVERED");
  });

  it("maps transit", () => {
    expect(carrierStatusToBoxStatus("in_transit")).toBe("IN_TRANSIT");
  });

  it("maps problem states to DELAYED", () => {
    for (const s of ["delay", "exception", "failure", "return_to_sender", "cancelled", "error"]) {
      expect(carrierStatusToBoxStatus(s)).toBe("DELAYED");
    }
  });

  it("maps pre-shipment states to PENDING", () => {
    expect(carrierStatusToBoxStatus("pre_transit")).toBe("PENDING");
    expect(carrierStatusToBoxStatus("unknown")).toBe("PENDING");
    expect(carrierStatusToBoxStatus("info_received")).toBe("PENDING");
  });

  it("returns null for unrecognized strings", () => {
    expect(carrierStatusToBoxStatus("blorp")).toBeNull();
  });
});
