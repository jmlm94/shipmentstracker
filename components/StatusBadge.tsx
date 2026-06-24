import { BoxStatus } from "@prisma/client";
import { STATUS_META } from "@/lib/status";

export function StatusBadge({ status }: { status: BoxStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
