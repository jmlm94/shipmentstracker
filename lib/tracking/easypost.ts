import { Carrier } from "@prisma/client";
import type { TrackingProvider, TrackingResult } from "./index";

// EasyPost integration. One API key tracks FedEx, UPS, DHL and many others.
// Docs: https://docs.easypost.com/docs/trackers
//
// We create (or reuse) a Tracker for the tracking number and read back its
// latest status. EasyPost dedupes trackers by (tracking_code, carrier).
//
// Carrier strings depend on the EasyPost account type: an account using
// EasyPost's built-in "Wallet" carriers must use FedExDefault / UPSDAP, while
// an account with its own carrier credentials uses FedEx / UPS. We try each
// candidate in order and remember which one the account accepts, so the extra
// attempt only ever happens once per carrier per warm instance.
const CARRIER_CANDIDATES: Record<Carrier, string[]> = {
  FEDEX: ["FedExDefault", "FedEx"], // EasyPost support: Wallet accounts need FedExDefault
  UPS: ["UPS", "UPSDAP"],
  USPS: ["USPS"],
  DHL: ["DHLExpress"],
  OTHER: [], // special / unknown delivery — not auto-trackable
};

const workingCandidate: Partial<Record<Carrier, number>> = {};

// Circuit breaker: 402 (unfunded account) and 429 (rate-limited) are
// account-level — every further call in the run would fail the same way and
// only make the rate-limiting worse. Pause all calls for a while instead.
let pausedUntil = 0;

export const easypostProvider: TrackingProvider = {
  name: "easypost",
  async track(trackingNumber: string, carrier: Carrier): Promise<TrackingResult | null> {
    const key = process.env.EASYPOST_API_KEY;
    if (!key) return null;
    const candidates = CARRIER_CANDIDATES[carrier];
    if (!candidates.length) return null; // e.g. OTHER / special delivery
    if (Date.now() < pausedUntil) return null;

    const auth = "Basic " + Buffer.from(`${key}:`).toString("base64");
    try {
      for (let i = workingCandidate[carrier] ?? 0; i < candidates.length; i++) {
        const res = await fetch("https://api.easypost.com/v2/trackers", {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            tracker: {
              tracking_code: trackingNumber,
              carrier: candidates[i],
            },
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          if (res.status === 402 || res.status === 429) {
            console.error(
              `[easypost] account-level ${res.status} — pausing tracking calls for 10 minutes`
            );
            pausedUntil = Date.now() + 10 * 60_000;
            return null;
          }
          // Wrong account type for this carrier string — try the next one.
          if (body.includes("CREDENTIALS_NOT_FOUND") && i + 1 < candidates.length) {
            console.warn(`[easypost] ${candidates[i]} not enabled, trying ${candidates[i + 1]}`);
            continue;
          }
          console.error("[easypost] error", res.status, body);
          return null;
        }

        workingCandidate[carrier] = i;

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
      }
      return null;
    } catch (err) {
      console.error("[easypost] fetch failed", err);
      return null;
    }
  },
};
