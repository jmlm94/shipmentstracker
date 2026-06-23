import { Carrier } from "@prisma/client";
import type { TrackingProvider, TrackingResult } from "./index";

// EasyPost integration. One API key tracks FedEx, UPS, DHL and many others.
// Docs: https://docs.easypost.com/docs/trackers
//
// We create (or reuse) a Tracker for the tracking number and read back its
// latest status. EasyPost dedupes trackers by (tracking_code, carrier).

const CARRIER_MAP: Record<Carrier, string> = {
  FEDEX: "FedEx",
  UPS: "UPS",
  DHL: "DHLExpress",
};

export const easypostProvider: TrackingProvider = {
  name: "easypost",
  async track(trackingNumber: string, carrier: Carrier): Promise<TrackingResult | null> {
    const key = process.env.EASYPOST_API_KEY;
    if (!key) return null;

    const auth = "Basic " + Buffer.from(`${key}:`).toString("base64");
    try {
      const res = await fetch("https://api.easypost.com/v2/trackers", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          tracker: {
            tracking_code: trackingNumber,
            carrier: CARRIER_MAP[carrier],
          },
        }),
      });

      if (!res.ok) {
        console.error("[easypost] error", res.status, await res.text());
        return null;
      }

      const data = (await res.json()) as {
        status?: string;
        status_detail?: string;
        tracking_details?: Array<{ message?: string; status?: string; datetime?: string }>;
      };

      const last = data.tracking_details?.[data.tracking_details.length - 1];
      const delivered = data.status === "delivered";

      return {
        rawStatus: data.status || "unknown",
        detail: last?.message || data.status_detail || undefined,
        deliveredAt: delivered && last?.datetime ? new Date(last.datetime) : null,
      };
    } catch (err) {
      console.error("[easypost] fetch failed", err);
      return null;
    }
  },
};
