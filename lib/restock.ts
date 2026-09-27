// Reorder planning math. THE ASSUMPTION: a fixed lead time between placing a
// production order and receiving it (production + shipping). Default 75 days,
// overridable with REORDER_LEAD_DAYS.
export const REORDER_LEAD_DAYS = Number(process.env.REORDER_LEAD_DAYS) > 0
  ? Number(process.env.REORDER_LEAD_DAYS)
  : 75;

// After a reorder lands, how many days of demand it should cover before the
// next one arrives (the order cycle used for the suggested quantity).
export const REORDER_CYCLE_DAYS = 90;

export type RestockPlan = {
  /** Average units sold per day over the sales window. */
  velocity: number;
  /** Days until stock (on hand + already incoming) runs out at current velocity. */
  daysOfCover: number | null;
  runOutDate: Date | null;
  /** Run-out minus lead time: the last day to place the order. */
  orderByDate: Date | null;
  /** Days from now until orderByDate (negative = overdue). */
  daysUntilOrder: number | null;
  /** Units to order now to cover lead time + one order cycle. */
  suggestedQty: number;
  urgency: "now" | "soon" | "ok" | "no-sales";
};

export function restockPlan(opts: {
  onHand: number; // can be negative (oversold) — treated as zero cover
  incoming: number; // units on order / on the way from open POs
  unitsSold: number; // units sold in the window
  windowDays: number; // e.g. 30
  leadDays?: number;
  cycleDays?: number;
  now?: Date;
}): RestockPlan {
  const lead = opts.leadDays ?? REORDER_LEAD_DAYS;
  const cycle = opts.cycleDays ?? REORDER_CYCLE_DAYS;
  const now = opts.now ?? new Date();
  const velocity = opts.windowDays > 0 ? opts.unitsSold / opts.windowDays : 0;
  const pool = Math.max(0, opts.onHand) + Math.max(0, opts.incoming);

  if (velocity <= 0) {
    return {
      velocity: 0,
      daysOfCover: null,
      runOutDate: null,
      orderByDate: null,
      daysUntilOrder: null,
      suggestedQty: 0,
      urgency: "no-sales",
    };
  }

  const daysOfCover = pool / velocity;
  const runOutDate = new Date(now.getTime() + daysOfCover * 86400e3);
  const orderByDate = new Date(runOutDate.getTime() - lead * 86400e3);
  const daysUntilOrder = daysOfCover - lead;
  // Enough that, when the order arrives in `lead` days, it covers `cycle` more
  // days of demand: demand over (lead + cycle) minus what's already available.
  const suggestedQty = Math.max(0, Math.ceil(velocity * (lead + cycle) - pool));

  return {
    velocity,
    daysOfCover,
    runOutDate,
    orderByDate,
    daysUntilOrder,
    suggestedQty,
    urgency: daysUntilOrder <= 0 ? "now" : daysUntilOrder <= 14 ? "soon" : "ok",
  };
}
