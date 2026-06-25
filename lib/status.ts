import { BoxStatus, Carrier, ShippingMethod } from "@prisma/client";

export const CARRIER_LABEL: Record<Carrier, string> = {
  UPS: "UPS",
  FEDEX: "FedEx",
  USPS: "USPS",
  DHL: "DHL",
  OTHER: "Other (Special Delivery)",
};

export const ALL_CARRIERS: Carrier[] = ["UPS", "FEDEX", "USPS", "DHL", "OTHER"];

export const METHOD_LABEL: Record<ShippingMethod, string> = {
  AIR: "Air ✈️",
  SEA: "Sea 🚢",
};

// Human-friendly labels and colors for each status, used across the UI.
export const STATUS_META: Record<
  BoxStatus,
  { label: string; emoji: string; color: string; dot: string; attention?: boolean }
> = {
  PENDING: { label: "Not shipped", emoji: "🕓", color: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  IN_TRANSIT: { label: "In transit", emoji: "🚚", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  DELAYED: { label: "Stuck", emoji: "⚠️", color: "bg-amber-100 text-amber-800", dot: "bg-amber-500", attention: true },
  DELIVERED: { label: "Delivered", emoji: "✅", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  DAMAGED: { label: "Damaged", emoji: "💥", color: "bg-orange-100 text-orange-800", dot: "bg-orange-500", attention: true },
  ADDED_IN_STOCK: { label: "Added in stock", emoji: "🏬", color: "bg-green-100 text-green-800", dot: "bg-green-600" },
  LOST: { label: "Lost", emoji: "❌", color: "bg-red-100 text-red-700", dot: "bg-red-500", attention: true },
};

// Order used everywhere statuses are listed (forms, tiles, filters).
export const ALL_STATUSES: BoxStatus[] = [
  "PENDING",
  "IN_TRANSIT",
  "DELAYED",
  "DELIVERED",
  "DAMAGED",
  "ADDED_IN_STOCK",
  "LOST",
];

// Statuses that need a human to act (shown in the "Needs attention" panel).
export const ATTENTION_STATUSES: BoxStatus[] = ALL_STATUSES.filter(
  (s) => STATUS_META[s].attention
);

// Logical next statuses from the current one. Any status can also go to
// Damaged or Lost. Used to keep the status dropdown sensible.
export function allowedNextStatuses(current: BoxStatus): BoxStatus[] {
  const fwd: Record<BoxStatus, BoxStatus[]> = {
    PENDING: ["IN_TRANSIT"],
    IN_TRANSIT: ["DELAYED", "DELIVERED"],
    DELAYED: ["IN_TRANSIT", "DELIVERED"],
    DELIVERED: ["ADDED_IN_STOCK"],
    ADDED_IN_STOCK: [],
    DAMAGED: ["ADDED_IN_STOCK"],
    LOST: ["IN_TRANSIT", "DELIVERED"],
  };
  const set = new Set<BoxStatus>([current, ...fwd[current], "DAMAGED", "LOST"]);
  return ALL_STATUSES.filter((s) => set.has(s));
}

// Maps a raw carrier tracking status string onto our BoxStatus enum.
export function carrierStatusToBoxStatus(raw: string): BoxStatus | null {
  const s = raw.toLowerCase();
  if (s.includes("deliver")) return "DELIVERED";
  if (s.includes("transit") || s.includes("out_for_delivery") || s.includes("in_transit"))
    return "IN_TRANSIT";
  if (s.includes("delay") || s.includes("exception") || s.includes("failure"))
    return "DELAYED";
  if (s.includes("pre_transit") || s.includes("unknown") || s.includes("info_received"))
    return "PENDING";
  return null;
}
