import { PoStatus } from "@prisma/client";

export const PO_STATUS_META: Record<PoStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-blue-100 text-blue-700" },
  PARTIALLY_RECEIVED: { label: "Partially received", cls: "bg-amber-100 text-amber-800" },
  RECEIVED: { label: "Received", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-100 text-slate-500" },
};

export function money(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
