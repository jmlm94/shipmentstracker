// Live carrier tracking lookup via EasyPost. Used by the AI assistant (and any
// on-demand "where is it" check). Creating a tracker is idempotent in EasyPost
// (deduped by tracking_code + carrier), so repeated calls are safe.
//
// Carrier strings depend on the EasyPost account type: accounts on EasyPost's
// built-in "Wallet" carriers must use FedExDefault / UPSDAP, accounts with
// their own carrier credentials use FedEx / UPS. We try candidates in order
// and fall through on "credentials not found".

const CARRIER_CANDIDATES: Record<string, string[]> = {
  FEDEX: ["FedExDefault", "FedEx"], // EasyPost support: Wallet accounts need FedExDefault
  UPS: ["UPS", "UPSDAP"],
  USPS: ["USPS"],
  DHL: ["DHLExpress"],
};

export type LiveTrackResult =
  | {
      trackingNumber: string;
      carrier?: string;
      status: string;
      statusDetail?: string | null;
      estDeliveryDate?: string | null;
      publicUrl?: string | null;
      scans: { status?: string; message?: string; datetime?: string; location?: string }[];
    }
  | { trackingNumber: string; error: string };

export async function liveTrack(trackingNumber: string, carrier?: string): Promise<LiveTrackResult> {
  const key = process.env.EASYPOST_API_KEY;
  if (!key) return { trackingNumber, error: "EasyPost is not configured (no EASYPOST_API_KEY)." };

  // No carrier given → let EasyPost auto-match the number (single attempt).
  const candidates = carrier ? CARRIER_CANDIDATES[carrier.toUpperCase()] || [undefined] : [undefined];
  const auth = "Basic " + Buffer.from(`${key}:`).toString("base64");

  try {
    for (let i = 0; i < candidates.length; i++) {
      const epCarrier = candidates[i];
      const res = await fetch("https://api.easypost.com/v2/trackers", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          tracker: { tracking_code: trackingNumber, ...(epCarrier ? { carrier: epCarrier } : {}) },
        }),
      });

      if (res.ok) {
        const d: any = await res.json();
        const details = Array.isArray(d.tracking_details) ? d.tracking_details : [];
        const scans = details.slice(-6).map((x: any) => ({
          status: x.status,
          message: x.message,
          datetime: x.datetime,
          location: x.tracking_location
            ? [x.tracking_location.city, x.tracking_location.state, x.tracking_location.country]
                .filter(Boolean)
                .join(", ")
            : undefined,
        }));
        return {
          trackingNumber,
          carrier: d.carrier,
          status: d.status || "unknown",
          statusDetail: d.status_detail || null,
          estDeliveryDate: d.est_delivery_date || null,
          publicUrl: d.public_url || null,
          scans,
        };
      }

      const t = await res.text().catch(() => "");
      console.error("[easypostTrack]", res.status, t.slice(0, 200));
      // Wrong account type for this carrier string — try the next candidate.
      if (t.includes("CREDENTIALS_NOT_FOUND") && i + 1 < candidates.length) continue;
      // Surface account-level problems honestly — they're fixable in the
      // EasyPost dashboard, not by retyping the tracking number.
      if (res.status === 402)
        return {
          trackingNumber,
          error:
            "The EasyPost account is out of funds — add billing at app.easypost.com (Account → Billing), then try again.",
        };
      if (res.status === 429)
        return {
          trackingNumber,
          error: "EasyPost is rate-limiting the account right now — try again in a few minutes.",
        };
      if (t.includes("CREDENTIALS_NOT_FOUND"))
        return {
          trackingNumber,
          error:
            "EasyPost doesn't have this carrier enabled on the account — check Carrier Accounts at app.easypost.com.",
        };
      return { trackingNumber, error: `EasyPost returned ${res.status}. Check the number/carrier.` };
    }
    return { trackingNumber, error: "EasyPost rejected every carrier variant for this number." };
  } catch (e) {
    console.error("[easypostTrack] fetch failed", e);
    return { trackingNumber, error: "Couldn't reach EasyPost." };
  }
}
