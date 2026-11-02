"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/admin/ui";
import { emailReceipt, voidReceipt } from "../actions";

export function ReceiptActions({ id, hasEmail, voided }: { id: string; hasEmail: boolean; voided: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const btn = "w-full rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-pine disabled:opacity-50";
  return (
    <div className="space-y-4">
      {msg ? <p role="status" className="rounded-xl bg-pine/8 px-4 py-2.5 text-sm text-pine">{msg}</p> : null}
      <Card title="Actions">
        <div className="grid gap-2">
          <a href={`/api/receipts/${id}/`} target="_blank" rel="noopener" className="w-full rounded-full bg-pine px-4 py-2.5 text-center text-sm font-semibold text-white">Open PDF</a>
          <button className={btn} disabled={pending || !hasEmail || voided} onClick={() => start(async () => { if (confirm("Email the PDF to the customer?")) setMsg((await emailReceipt(id)).message); })}>Email to the customer</button>
          {!voided ? <button className={`${btn} text-red-700`} disabled={pending} onClick={() => { const reason = prompt("Why is this being cancelled? (kept in the records)"); if (reason) start(async () => { setMsg((await voidReceipt(id, reason)).message); router.refresh(); }); }}>Cancel this receipt</button> : null}
        </div>
      </Card>
    </div>
  );
}
