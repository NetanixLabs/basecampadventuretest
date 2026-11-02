"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { saveAgent } from "./actions";

type V = { name: string; company: string; email: string; phone: string; country: string; code: string; commissionPct: number; notes: string; active: boolean };
const EMPTY: V = { name: "", company: "", email: "", phone: "", country: "", code: "", commissionPct: 10, notes: "", active: true };

export function AgentEditor({ id, initial }: { id: string | null; initial: V | null }) {
  const router = useRouter();
  const [v, setV] = useState<V>(initial ?? EMPTY);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title={id ? `Edit ${initial?.company || initial?.name}` : "Add an agent"}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveAgent(id, v); setMsg(r.message); if (r.ok) { if (!id) setV(EMPTY); router.push("/agents"); router.refresh(); } }); }}>
        <div><Label htmlFor="a-c">Agency</Label><input id="a-c" value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} className={inputClass} /></div>
        <div><Label htmlFor="a-n">Contact name</Label><input id="a-n" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="a-code" info="Used in their link: basecampadventure.com/?ref=CODE">Code</Label><input id="a-code" required value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} className={`${inputClass} font-mono`} placeholder="ALPINE-DE" /></div>
          <div><Label htmlFor="a-p">Commission %</Label><input id="a-p" inputMode="decimal" value={v.commissionPct} onChange={(e) => setV({ ...v, commissionPct: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} className={inputClass} /></div>
        </div>
        <div><Label htmlFor="a-e">Email</Label><input id="a-e" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="a-ph">Phone</Label><input id="a-ph" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className={inputClass} /></div>
          <div><Label htmlFor="a-co">Country</Label><input id="a-co" value={v.country} onChange={(e) => setV({ ...v, country: e.target.value })} className={inputClass} /></div>
        </div>
        <div><Label htmlFor="a-no">Notes</Label><textarea id="a-no" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} className={inputClass} placeholder="Contract terms, payment schedule…" /></div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="size-4 accent-[var(--pine)]" /> Active</label>
        <div className="flex gap-2">
          <button disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{id ? "Save" : "Add agent"}</button>
          {id ? <button type="button" onClick={() => router.push("/agents")} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold">Cancel</button> : null}
        </div>
        {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      </form>
    </Card>
  );
}
