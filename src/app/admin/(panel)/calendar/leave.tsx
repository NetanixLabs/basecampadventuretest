"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inputClass, Label } from "@/components/admin/ui";
import { addLeave, removeLeave } from "../departures/actions";

export function LeaveForm({ guides }: { guides: { id: string; name: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState({ guideId: guides[0]?.id ?? "", from: "", to: "", note: "" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  if (!guides.length) return <p className="text-sm text-muted">Add your guides and porters first (Guides &amp; porters).</p>;
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addLeave(v); setMsg(r.message); if (r.ok) { setV({ ...v, from: "", to: "", note: "" }); router.refresh(); } }); }}>
      <div className="sm:col-span-2"><Label htmlFor="lv-g">Who</Label><select id="lv-g" value={v.guideId} onChange={(e) => setV({ ...v, guideId: e.target.value })} className={inputClass}>{guides.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
      <div><Label htmlFor="lv-f">First day</Label><input id="lv-f" type="date" required value={v.from} onChange={(e) => setV({ ...v, from: e.target.value, to: v.to && v.to < e.target.value ? e.target.value : v.to })} className={inputClass} /></div>
      <div><Label htmlFor="lv-t">Last day</Label><input id="lv-t" type="date" min={v.from} value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} className={inputClass} /></div>
      <div className="sm:col-span-2"><Label htmlFor="lv-n">Note (optional)</Label><input id="lv-n" maxLength={120} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} className={inputClass} placeholder="e.g. Dashain at home" /></div>
      <div className="flex items-center gap-3 sm:col-span-2"><button disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save days off</button>{msg ? <p role="status" className="text-sm text-pine">{msg}</p> : null}</div>
    </form>
  );
}

export function LeaveList({ items }: { items: { id: string; name: string; from: string; to: string; note: string | null }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const d = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  if (!items.length) return <p className="text-sm text-muted">Everyone is available this month.</p>;
  return (
    <ul className="divide-y divide-line text-sm">
      {items.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-3 py-2">
          <span className="min-w-0"><strong>{l.name}</strong> · {d(l.from)}{l.to !== l.from ? ` to ${d(l.to)}` : ""}{l.note ? <span className="block truncate text-xs text-muted">{l.note}</span> : null}</span>
          <button type="button" disabled={pending} onClick={() => { if (confirm(`Remove ${l.name}'s days off?`)) start(async () => { await removeLeave(l.id); router.refresh(); }); }} className="shrink-0 text-xs font-semibold text-muted hover:text-red-600">Remove</button>
        </li>
      ))}
    </ul>
  );
}
