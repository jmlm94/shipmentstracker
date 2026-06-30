// Live carrier tracking lookup via EasyPost. Used by the AI assistant (and any
// on-demand "where is it" check). Creating a tracker is idempotent in EasyPost
// (deduped by tracking_code + carrier), so repeated calls are safe.

const CARRIER_MAP: Record<string, string> = {
  FEDEX: "FedEx",
  UPS: "UPS",
  USPS: "USPS",
  DHL: "DHLExpress",
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

  const epCarrier = carrier ? CARRIER_MAP[carrier.toUpperCase()] : undefined;
  const auth = "Basic " + Buffer.from(`${key}:`).toString("base64");

  try {
    const res = await fetch("https://api.easypost.com/v2/trackers", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        tracker: { tracking_code: trackingNumber, ...(epCarrier ? { carrier: epCarrier } : {}) },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[easypostTrack]", res.status, t.slice(0, 200));
      return { trackingNumber, error: `EasyPost returned ${res.status}. Check the number/carrier.` };
    }
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
  } catch (e) {
    console.error("[easypostTrack] fetch failed", e);
    return { trackingNumber, error: "Couldn't reach EasyPost." };
  }
}
