import { BoxStatus } from "@prisma/client";

// Human-friendly labels and colors for each status, used across the UI.
export const STATUS_META: Record<
  BoxStatus,
  { label: string; color: string; dot: string }
> = {
  PENDING: { label: "Pending", color: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  IN_TRANSIT: { label: "In transit", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  DELAYED: { label: "Delayed", color: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  DELIVERED: { label: "Delivered", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  ADDED_IN_STOCK: { label: "Added in stock", color: "bg-green-100 text-green-800", dot: "bg-green-600" },
  LOST: { label: "Lost", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

export const ALL_STATUSES: BoxStatus[] = [
  "PENDING",
  "IN_TRANSIT",
  "DELAYED",
  "DELIVERED",
  "ADDED_IN_STOCK",
  "LOST",
];

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
