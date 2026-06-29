"use client";

import { useState } from "react";
import { InvoiceUpload } from "./InvoiceUpload";
import { OrderForm, type OrderFormInitial } from "./OrderForm";

export function NewOrderClient() {
  const [draft, setDraft] = useState<OrderFormInitial | null>(null);
  // Remount the form when a new invoice is imported so it picks up the draft.
  const [key, setKey] = useState(0);

  return (
    <>
      <InvoiceUpload
        onParsed={(d) => {
          setDraft({ ...d, id: undefined });
          setKey((k) => k + 1);
        }}
      />
      <OrderForm key={key} initial={draft ?? undefined} />
    </>
  );
}
