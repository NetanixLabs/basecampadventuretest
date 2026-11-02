"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { createReceiptAction } from "../actions";

type Item = { description: string; qty: number; unitPrice: number };
type V = { kind: "receipt" | "bill"; bookingId: string | null; customerName: string; customerEmail: string; customerAddress: string; currency: string; paidVia: string; paidAt: string; notes: string; items: Item[] };

export function ReceiptForm({ initial, vat }: { initial: V; vat: { mode: string; rate: number } }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const lines = v.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const vatAmt = vat.mode === "added" ? (lines * vat.rate) / 100 : vat.mode === "included" ? lines - lines / (1 + vat.rate / 100) : 0;
  const total = vat.mode === "added" ? lines + vatAmt : lines;
  const setItem = (i: number, patch: Partial<Item>) => setV({ ...v, items: v.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const num = (s: string) => Number(s.replace(/[^0-9.-]/g, "")) || 0;
  return (
    <form className="space-y-6 pb-24 lg:pb-0" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createReceiptAction(v); setMsg(r.message); if (r.ok && r.id) router.push(`/receipts/${r.id}`); }); }}>
      <Card title="Type">
        <div className="flex flex-wrap gap-2">
          {(["receipt", "bill"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setV({ ...v, kind: k })} className={`rounded-full px-5 py-2 text-sm font-semibold ${v.kind === k ? "bg-pine text-white" : "border border-line"}`}>{k === "receipt" ? "Receipt (money received)" : "Bill (asking for payment)"}</button>
          ))}
        </div>
      </Card>
      <Card title="Customer">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="r-n">Name</Label><input id="r-n" required value={v.customerName} onChange={(e) => setV({ ...v, customerName: e.target.value })} className={inputClass} /></div>
          <div><Label htmlFor="r-e" info="Needed to email the PDF.">Email</Label><input id="r-e" type="email" value={v.customerEmail} onChange={(e) => setV({ ...v, customerEmail: e.target.value })} className={inputClass} /></div>
          <div className="sm:col-span-2"><Label htmlFor="r-a">Address (optional)</Label><input id="r-a" value={v.customerAddress} onChange={(e) => setV({ ...v, customerAddress: e.target.value })} className={inputClass} /></div>
        </div>
      </Card>
      <Card title="Lines" info={vat.mode === "none" ? "No VAT line is printed (Settings → Receipts)." : vat.mode === "added" ? `VAT ${vat.rate}% is added on top.` : `Prices include VAT ${vat.rate}%; the receipt shows the VAT part.`}>
        <div className="space-y-3">
          {v.items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_4rem_7rem_auto] items-end gap-2">
              <div><Label htmlFor={`d${i}`}>Description</Label><input id={`d${i}`} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} className={inputClass} placeholder="e.g. Everest Base Camp Trek, balance" /></div>
              <div><Label htmlFor={`q${i}`}>Qty</Label><input id={`q${i}`} inputMode="numeric" value={it.qty} onChange={(e) => setItem(i, { qty: num(e.target.value) })} className={inputClass} /></div>
              <div><Label htmlFor={`u${i}`}>Unit price</Label><input id={`u${i}`} inputMode="decimal" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: num(e.target.value) })} className={inputClass} /></div>
              <button type="button" aria-label="Remove line" disabled={v.items.length < 2} onClick={() => setV({ ...v, items: v.items.filter((_, j) => j !== i) })} className="mb-1 grid size-10 place-items-center rounded-lg text-muted hover:text-red-600 disabled:opacity-30"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setV({ ...v, items: [...v.items, { description: "", qty: 1, unitPrice: 0 }] })} className="inline-flex items-center gap-1 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine"><Plus className="size-4" /> Add a line</button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div><Label htmlFor="r-c">Currency</Label><select id="r-c" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })} className={inputClass}>{["USD", "EUR", "GBP", "AUD", "NPR", "INR", "CNY"].map((c) => <option key={c}>{c}</option>)}</select></div>
          {v.kind === "receipt" ? (
            <>
              <div><Label htmlFor="r-v">Paid by</Label><input id="r-v" list="paid-via" value={v.paidVia} onChange={(e) => setV({ ...v, paidVia: e.target.value })} className={inputClass} /><datalist id="paid-via"><option>Bank transfer</option><option>Cash at the office</option><option>Card at the office</option><option>Card via WeTravel</option><option>Wise</option></datalist></div>
              <div><Label htmlFor="r-d">Paid on</Label><input id="r-d" type="date" value={v.paidAt} onChange={(e) => setV({ ...v, paidAt: e.target.value })} className={inputClass} /></div>
            </>
          ) : null}
        </div>
        <p className="mt-5 text-right text-lg font-bold">{vat.mode === "added" ? <span className="mr-4 text-sm font-normal text-muted">incl. VAT {vatAmt.toFixed(2)}</span> : null}Total {v.currency} {total.toFixed(2)}</p>
      </Card>
      <Card title="Note (printed on the PDF)"><textarea rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} className={inputClass} aria-label="Note" /></Card>
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-card px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <button disabled={pending} className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Creating…" : `Create ${v.kind}`}</button>
        {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      </div>
    </form>
  );
}
