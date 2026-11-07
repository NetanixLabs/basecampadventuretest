"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { creditNote, emailReceipt, voidReceipt } from "../actions";

export function ReceiptActions({ id, hasEmail, voided, refundable, currency, linked, paidVia, kindName }: { id: string; hasEmail: boolean; voided: boolean; refundable: number; currency: string; linked: boolean; paidVia: string; kindName: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const [cn, setCn] = useState({ amount: refundable ? String(refundable) : "", reason: "", method: paidVia, recordRefund: linked, email: hasEmail });
  const btn = "w-full rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-pine disabled:opacity-50";
  return (
    <div className="space-y-4">
      {msg ? <p role="status" className="rounded-xl bg-pine/8 px-4 py-2.5 text-sm text-pine">{msg}</p> : null}
      <Card title="Actions">
        <div className="grid gap-2">
          <a href={`/api/receipts/${id}/`} target="_blank" rel="noopener" className="w-full rounded-full bg-pine px-4 py-2.5 text-center text-sm font-semibold text-white">Open PDF</a>
          <button className={btn} disabled={pending || !hasEmail || voided} onClick={() => start(async () => { if (confirm("Email the PDF to the customer?")) setMsg((await emailReceipt(id)).message); })}>Email to the customer</button>
          {!voided ? <button className={`${btn} text-red-700`} disabled={pending} onClick={() => { const reason = prompt(`Why is this ${kindName.toLowerCase()} being cancelled? (kept in the records)`); if (reason) start(async () => { setMsg((await voidReceipt(id, reason)).message); router.refresh(); }); }}>Cancel this {kindName.toLowerCase()}</button> : null}
        </div>
      </Card>
      {refundable > 0 ? (
        <Card title="Refund (credit note)" info="When money goes back to the traveller (a cancellation or a change), make a credit note instead of cancelling the receipt: the receipt stays in the books and the credit note, with its own number and QR check, shows the refund. Up to the amount not yet refunded on this receipt.">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!confirm(`Make a credit note for ${currency} ${cn.amount}?`)) return; start(async () => { const r = await creditNote(id, { ...cn, amount: Number(cn.amount) }); setMsg(r.message); if (r.ok && r.id) router.push(`/receipts/${r.id}`); }); }}>
            <div><Label htmlFor="cn-a" info={`At most ${currency} ${refundable.toFixed(2)}.`}>Amount refunded ({currency})</Label><input id="cn-a" inputMode="decimal" required value={cn.amount} onChange={(e) => setCn({ ...cn, amount: e.target.value.replace(/[^0-9.]/g, "") })} className={inputClass} /></div>
            <div><Label htmlFor="cn-r">Reason (printed)</Label><input id="cn-r" required maxLength={200} value={cn.reason} onChange={(e) => setCn({ ...cn, reason: e.target.value })} className={inputClass} placeholder="e.g. Cancellation 45 days before departure" /></div>
            <div><Label htmlFor="cn-m">Refunded via</Label><input id="cn-m" maxLength={60} value={cn.method} onChange={(e) => setCn({ ...cn, method: e.target.value })} className={inputClass} placeholder="e.g. Card via WeTravel" /></div>
            {linked ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={cn.recordRefund} onChange={(e) => setCn({ ...cn, recordRefund: e.target.checked })} className="mt-0.5 size-4 accent-[var(--pine)]" />Take it off the booking&apos;s &quot;paid so far&quot;</label> : null}
            {hasEmail ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={cn.email} onChange={(e) => setCn({ ...cn, email: e.target.checked })} className="mt-0.5 size-4 accent-[var(--pine)]" />Email the credit note to the customer</label> : null}
            <button disabled={pending} className="w-full rounded-full bg-crimson px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Working…" : "Make credit note"}</button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
