import { BoxStatus } from "@prisma/client";

// Human-friendly labels and colors for each status, used across the UI.
export const STATUS_META: Record<
  BoxStatus,
  { label: string; color: string; dot: string; attention?: boolean }
> = {
  PENDING: { label: "Not shipped", color: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  IN_TRANSIT: { label: "In transit", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  DELAYED: { label: "Stuck", color: "bg-amber-100 text-amber-800", dot: "bg-amber-500", attention: true },
  DELIVERED: { label: "Delivered", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  DAMAGED: { label: "Damaged", color: "bg-orange-100 text-orange-800", dot: "bg-orange-500", attention: true },
  ADDED_IN_STOCK: { label: "Added in stock", color: "bg-green-100 text-green-800", dot: "bg-green-600" },
  LOST: { label: "Lost", color: "bg-red-100 text-red-700", dot: "bg-red-500", attention: true },
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
