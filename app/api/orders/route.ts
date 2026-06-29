import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { poCodeFor } from "@/lib/code";
import { orderBodySchema } from "@/lib/po";

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = orderBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 422 }
    );
  }
  const d = parsed.data;

  // Sequential code based on the current count (retry on the rare clash).
  let code = poCodeFor((await prisma.purchaseOrder.count()) + 1);
  for (let i = 0; i < 5; i++) {
    if (!(await prisma.purchaseOrder.findUnique({ where: { code } }))) break;
    code = poCodeFor((await prisma.purchaseOrder.count()) + 1 + i + 1);
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      code,
      status: "DRAFT", // new orders start as a draft until finalized
      supplierName: d.supplierName,
      supplierEmail: d.supplierEmail || null,
      supplierContact: d.supplierContact || null,
      orderDate: d.orderDate ? new Date(d.orderDate) : new Date(),
      expectedDate: d.expectedDate ? new Date(d.expectedDate) : null,
      currency: d.currency || "USD",
      notes: d.notes || null,
      items: {
        create: d.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          productImage: it.productImage || null,
          sku: it.sku || null,
          quantity: it.quantity,
          unitCost: it.unitCost,
          receivedQty: it.receivedQty ?? 0,
        })),
      },
      costs: {
        create: d.costs.map((c, i) => ({
          kind: c.kind,
          label: c.label,
          amount: c.amount,
          sort: i,
        })),
      },
    },
  });

  return NextResponse.json({ id: po.id, code: po.code });
}
