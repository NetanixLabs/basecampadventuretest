"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { deleteCustomer, saveCustomer } from "../actions";

type V = { name: string; email: string; phone: string; country: string; notes: string; tags: string[]; details: Record<string, string> };

export function CustomerForm({ id, initial, fields }: { id: string | null; initial: V; fields: { key: string; label: string; type?: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveCustomer(id, { ...v, tags: tagText.split(",").map((t) => t.trim()).filter(Boolean) }); setMsg(r.message); if (r.ok && !id && r.id) router.replace(`/customers/${r.id}`); else router.refresh(); }); }}>
      <Card title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="c-n">Name</Label><input id="c-n" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputClass} /></div>
          <div><Label htmlFor="c-e">Email</Label><input id="c-e" type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} className={inputClass} /></div>
          <div><Label htmlFor="c-p">Phone / WhatsApp</Label><input id="c-p" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className={inputClass} /></div>
          <div><Label htmlFor="c-c">Country</Label><input id="c-c" value={v.country} onChange={(e) => setV({ ...v, country: e.target.value })} className={inputClass} /></div>
          <div className="sm:col-span-2"><Label htmlFor="c-t" info="Separate with commas, e.g. repeat, vip, agent-referral. Click a tag in the list to filter.">Tags</Label><input id="c-t" value={tagText} onChange={(e) => setTagText(e.target.value)} className={inputClass} /></div>
        </div>
      </Card>
      <Card title="Private details" info="Stored encrypted. Only people with the Customers permission can see them.">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key}><Label htmlFor={`cd-${f.key}`}>{f.label}</Label><input id={`cd-${f.key}`} type={f.type ?? "text"} value={v.details[f.key] ?? ""} onChange={(e) => setV({ ...v, details: { ...v.details, [f.key]: e.target.value } })} className={inputClass} autoComplete="off" /></div>
          ))}
        </div>
      </Card>
      <Card title="Notes"><textarea rows={5} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} className={inputClass} aria-label="Notes" placeholder="Preferences, past feedback, room sharing, anything useful…" /></Card>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save customer"}</button>
        {id ? <button type="button" disabled={pending} onClick={() => start(async () => { if (!confirm("Delete this customer record? Their bookings and receipts are kept.")) return; const r = await deleteCustomer(id); if (r.ok) router.push("/customers"); else setMsg(r.message); })} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted hover:text-red-600">Delete</button> : null}
        {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      </div>
    </form>
  );
}
