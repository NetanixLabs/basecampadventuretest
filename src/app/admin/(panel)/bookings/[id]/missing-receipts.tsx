"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { receiptForPaymentAction } from "../../receipts/actions";

/** Payments made before receipts existed (or if one failed): make their receipt with one click. */
export function MissingReceipts({ payments }: { payments: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!payments.length) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      {payments.map((p) => (
        <button key={p.id} disabled={pending} onClick={() => start(async () => { const r = await receiptForPaymentAction(p.id); if (!r.ok) alert(r.message); router.refresh(); })} className="block w-full rounded-full border border-dashed border-line px-4 py-2 text-left text-sm font-semibold hover:border-pine disabled:opacity-50">Make receipt for {p.label}</button>
      ))}
    </div>
  );
}
