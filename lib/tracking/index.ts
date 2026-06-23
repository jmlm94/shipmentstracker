import { Carrier } from "@prisma/client";

export interface TrackingResult {
  // Raw status string from the carrier (e.g. "in_transit", "delivered").
  rawStatus: string;
  // Free-text detail / latest scan description.
  detail?: string;
  // When the package was delivered, if known.
  deliveredAt?: Date | null;
}

export interface TrackingProvider {
  name: string;
  // Fetch the latest tracking status for a single tracking number.
  track(trackingNumber: string, carrier: Carrier): Promise<TrackingResult | null>;
}

// A no-op provider: returns null so nothing changes. Used when no carrier
// integration is configured (status is then updated manually at the warehouse).
const noopProvider: TrackingProvider = {
  name: "none",
  async track() {
    return null;
  },
};

export async function getTrackingProvider(): Promise<TrackingProvider> {
  const provider = (process.env.TRACKING_PROVIDER || "none").toLowerCase();
  if (provider === "easypost" && process.env.EASYPOST_API_KEY) {
    const { easypostProvider } = await import("./easypost");
    return easypostProvider;
  }
  return noopProvider;
}
