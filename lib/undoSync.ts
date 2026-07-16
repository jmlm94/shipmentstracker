import { prisma } from "./prisma";
import { statusFromReceived } from "./po";
import { logPoEvent } from "./poLog";

// Reverts the damage from the (now removed) "Sync received" button, which
// replaced received totals with box-derived counts and wiped manually
// recorded receipts. The activity log recorded every change it made
// ("−4016 × Product received — now 2000 of 15376"), so the previous totals
// can be reconstructed: before = after − delta.
//
// Only the most recent burst of `manual sync` events is reverted, and only if
// it hasn't been reverted already (a revert writes an EDIT marker).
const EVENT_RE = /^([+-]?\d+) × (.+) received — now (\d+) of \d+/;
const REVERT_MARKER = "Reverted 'Sync received'";
const BURST_WINDOW_MS = 2 * 60_000;

export async function undoLastManualSync(
  poId: string
): Promise<{ restored: number } | { error: string }> {
  const events = await prisma.poEvent.findMany({
    where: { purchaseOrderId: poId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const lastRevert = events.find((e) => e.kind === "EDIT" && e.message.startsWith(REVERT_MARKER));
  const syncEvents = events.filter(
    (e) =>
      e.kind === "RECEIVED" &&
      e.source === "manual sync" &&
      (!lastRevert || e.createdAt > lastRevert.createdAt)
  );
  if (syncEvents.length === 0) return { error: "Nothing to undo — no un-reverted sync found." };

  // The burst = all manual-sync events written within a couple of minutes of
  // the newest one (a single button press writes them within seconds).
  const newest = syncEvents[0].createdAt.getTime();
  const burst = syncEvents.filter((e) => newest - e.createdAt.getTime() <= BURST_WINDOW_MS);

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: true },
  });
  if (!po) return { error: "Order not found." };

  const restores: { itemId: string; name: string; from: number; to: number; quantity: number }[] = [];
  for (const ev of burst) {
    const m = EVENT_RE.exec(ev.message);
    if (!m) continue;
    const delta = Number(m[1]);
    const name = m[2];
    const after = Number(m[3]);
    const item = po.items.find((it) => it.productName === name);
    if (!item) continue;
    // Only restore items still showing the post-sync value — if something
    // changed since (new delivery, manual edit), leave it alone.
    if (item.receivedQty !== after) continue;
    const before = Math.max(0, Math.min(item.quantity, after - delta));
    restores.push({ itemId: item.id, name, from: item.receivedQty, to: before, quantity: item.quantity });
  }
  if (restores.length === 0) {
    return { error: "Nothing to undo — the counts have changed since that sync." };
  }

  const nextItems = po.items.map((it) => {
    const r = restores.find((x) => x.itemId === it.id);
    return { quantity: it.quantity, receivedQty: r ? r.to : it.receivedQty };
  });
  const nextStatus = statusFromReceived(nextItems, po.status);

  await prisma.$transaction([
    ...restores.map((r) =>
      prisma.purchaseOrderItem.update({ where: { id: r.itemId }, data: { receivedQty: r.to } })
    ),
    prisma.purchaseOrder.update({ where: { id: poId }, data: { status: nextStatus } }),
  ]);

  for (const r of restores) {
    await logPoEvent(
      poId,
      "RECEIVED",
      `${r.to - r.from > 0 ? "+" : ""}${r.to - r.from} × ${r.name} received — now ${r.to} of ${r.quantity} (${Math.max(0, r.quantity - r.to)} remaining)`,
      "undo"
    );
  }
  await logPoEvent(
    poId,
    "EDIT",
    `${REVERT_MARKER} — restored ${restores.length} item count${restores.length === 1 ? "" : "s"}`,
    "dashboard"
  );

  return { restored: restores.length };
}
