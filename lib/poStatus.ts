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

export type UnifiedCost = { kind: "SHIPPING" | "OTHER"; label: string; amount: number };

// Resolve a PO's cost lines, falling back to the legacy single-cost columns for
// orders created before multi-cost support (and not yet re-saved).
export function unifyCosts(po: {
  costs?: { kind: string; label: string; amount: number; sort: number }[] | null;
  shippingCost?: number;
  otherCost?: number;
  otherCostLabel?: string | null;
}): UnifiedCost[] {
  if (po.costs && po.costs.length) {
    return [...po.costs]
      .sort((a, b) => a.sort - b.sort)
      .map((c) => ({
        kind: c.kind === "OTHER" ? "OTHER" : "SHIPPING",
        label: c.label,
        amount: c.amount,
      }));
  }
  const out: UnifiedCost[] = [];
  if (po.shippingCost) out.push({ kind: "SHIPPING", label: "Shipping", amount: po.shippingCost });
  if (po.otherCost)
    out.push({ kind: "OTHER", label: po.otherCostLabel || "Other", amount: po.otherCost });
  return out;
}
