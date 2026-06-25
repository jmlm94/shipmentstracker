import { Carrier } from "@prisma/client";

// Public tracking URL for a carrier + tracking number. Returns null for
// carriers we can't deep-link (e.g. OTHER / special delivery).
export function trackingUrl(carrier: Carrier, num: string): string | null {
  const n = (num || "").trim();
  if (!n) return null;
  const e = encodeURIComponent(n);
  switch (carrier) {
    case "UPS":
      return `https://www.ups.com/track?tracknum=${e}`;
    case "FEDEX":
      return `https://www.fedex.com/fedextrack/?trknbr=${e}`;
    case "DHL":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${e}`;
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${e}`;
    default:
      return null;
  }
}
