import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { unifyCosts } from "@/lib/poStatus";
import { OrderForm, type OrderFormInitial } from "../../OrderForm";

export const dynamic = "force-dynamic";

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: { items: true, costs: true },
  });
  if (!po) notFound();

  const costs = unifyCosts(po);
  const initial: OrderFormInitial = {
    id: po.id,
    supplierName: po.supplierName,
    supplierEmail: po.supplierEmail ?? "",
    supplierContact: po.supplierContact ?? "",
    orderDate: ymd(po.orderDate),
    expectedDate: ymd(po.expectedDate),
    currency: po.currency,
    notes: po.notes ?? "",
    items: po.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      productImage: it.productImage ?? "",
      sku: it.sku ?? "",
      quantity: String(it.quantity),
      unitCost: String(it.unitCost),
      receivedQty: it.receivedQty ? String(it.receivedQty) : "",
    })),
    shippingCosts: costs
      .filter((c) => c.kind === "SHIPPING")
      .map((c) => ({ label: c.label, amount: String(c.amount) })),
    otherCosts: costs
      .filter((c) => c.kind === "OTHER")
      .map((c) => ({
        label: c.label,
        amount: String(Math.abs(c.amount)),
        sign: c.amount < 0 ? ("-" as const) : ("+" as const),
      })),
  };

  return (
    <div className="max-w-4xl">
      <Link href={`/dashboard/orders/${po.id}`} className="text-sm text-muted hover:text-ink">
        ← Back to {po.code}
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-semibold">✏️ Edit {po.code}</h1>
        <p className="mt-1 text-sm text-muted">
          Adjust quantities, costs, credits, and received amounts. Status updates
          automatically from what&apos;s been received.
        </p>
      </div>
      <OrderForm initial={initial} />
    </div>
  );
}
