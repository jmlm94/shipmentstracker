import { PoStatus } from "@prisma/client";

export const PO_STATUS_META: Record<PoStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
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

// A PO's cost lines in display order. (Legacy single-cost columns were folded
// into PurchaseOrderCost rows by migration 20260701000001.)
export function unifyCosts(po: {
  costs?: { kind: string; label: string; amount: number; sort: number }[] | null;
}): UnifiedCost[] {
  return [...(po.costs ?? [])]
    .sort((a, b) => a.sort - b.sort)
    .map((c) => ({
      kind: c.kind === "OTHER" ? "OTHER" : "SHIPPING",
      label: c.label,
      amount: c.amount,
    }));
}

export type PoFinancialItem = {
  quantity: number;
  unitCost: number;
};

export type PoFinancials = {
  subtotal: number;
  costsTotal: number; // shipping + other charges − credits
  /** SHIPPING-kind costs only — paid in advance, so never part of the balance. */
  shippingTotal: number;
  total: number;
  orderedUnits: number;
  /** True per-unit cost of goods: total ÷ ordered units. Null when no units. */
  landedUnitCost: number | null;
  paid: number;
  /**
   * What's still owed to the supplier for the GOODS: (total − shipping) − paid.
   * Shipping is always paid in advance and settled separately, so it counts
   * toward the total but never toward the balance due. Negative = overpaid.
   */
  balance: number;
};

// The importer's key numbers for one purchase order.
export function poFinancials(
  items: PoFinancialItem[],
  costs: { amount: number; kind?: string }[],
  payments: { amount: number | null }[] = []
): PoFinancials {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
  const costsTotal = costs.reduce((s, c) => s + c.amount, 0);
  const shippingTotal = costs.reduce((s, c) => s + (c.kind === "SHIPPING" ? c.amount : 0), 0);
  const total = subtotal + costsTotal;
  const orderedUnits = items.reduce((s, it) => s + it.quantity, 0);
  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  return {
    subtotal,
    costsTotal,
    shippingTotal,
    total,
    orderedUnits,
    landedUnitCost: orderedUnits > 0 ? total / orderedUnits : null,
    paid,
    balance: total - shippingTotal - paid,
  };
}

/**
 * Landed cost per unit for ONE line item: its unit cost plus this line's share
 * of the PO's shared costs (shipping, fees, credits). Shared costs are
 * allocated proportionally to line value; when the PO has no item value at all
 * (e.g. costs-only order), they're allocated per unit instead.
 */
export function itemLandedUnitCost(
  item: PoFinancialItem,
  fin: Pick<PoFinancials, "subtotal" | "costsTotal" | "orderedUnits">
): number | null {
  if (item.quantity <= 0) return null;
  const lineValue = item.quantity * item.unitCost;
  const share =
    fin.subtotal > 0
      ? fin.costsTotal * (lineValue / fin.subtotal)
      : fin.orderedUnits > 0
        ? fin.costsTotal * (item.quantity / fin.orderedUnits)
        : 0;
  return item.unitCost + share / item.quantity;
}
