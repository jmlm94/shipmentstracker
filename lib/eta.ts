import { BoxStatus, ShippingMethod } from "@prisma/client";

// Carbinox lead-time rules (hard business logic, not user-configurable).
export const LEAD_DAYS: Record<ShippingMethod, number> = { AIR: 45, SEA: 60 };

const DAY = 24 * 60 * 60 * 1000;

// Statuses that are "done" — not counted toward in-transit / overdue.
export const TERMINAL_STATUSES: BoxStatus[] = ["DELIVERED", "ADDED_IN_STOCK", "LOST", "DAMAGED"];

export function etaFor(
  shipmentDate: Date,
  method: ShippingMethod,
  expected?: Date | null
): Date {
  if (expected) return expected;
  return new Date(shipmentDate.getTime() + LEAD_DAYS[method] * DAY);
}

export function daysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / DAY);
}

export function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY);
}

// Color band for a days-in-transit counter.
export function transitSeverity(days: number): "green" | "amber" | "red" {
  if (days >= 30) return "red";
  if (days >= 15) return "amber";
  return "green";
}
