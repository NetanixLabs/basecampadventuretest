"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Card, Empty, inputClass, Label, money } from "@/components/admin/ui";
import { FieldView } from "@/components/admin/form/fields";
import { deleteDiscount, saveDiscount } from "../sales-actions";

type Code = { id: string; code: string; label: string; kind: string; value: number; startsAt: string; endsAt: string; maxUses: number | null; used: number; trips: string[]; minPax: number; active: boolean; revenue: number; saved: number };
const blank = { code: "", label: "", kind: "percent", value: 10, startsAt: "", endsAt: "", maxUses: "", minPax: 1, trips: [] as string[], active: true };

export function DiscountManager({ codes, trips }: { codes: Code[]; trips: { value: string; label: string }[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<{ id: string | null; v: typeof blank } | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const state = (c: Code) => (!c.active ? ["Off", "gray"] : c.endsAt && c.endsAt < today ? ["Expired", "gray"] : c.startsAt && c.startsAt > today ? ["Scheduled", "blue"] : c.maxUses !== null && c.used >= c.maxUses ? ["Used up", "gray"] : ["Active", "green"]) as [string, "gray" | "blue" | "green"];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-3">
        {codes.length ? codes.map((c) => {
          const [l, t] = state(c);
          return (
            <button key={c.id} type="button" onClick={() => setEdit({ id: c.id, v: { ...blank, ...c, maxUses: c.maxUses === null ? "" : String(c.maxUses) } })} className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-4 text-left hover:border-pine">
              <span className="font-mono text-lg font-bold">{c.code}</span>
              <Badge tone={t}>{l}</Badge>
              <span className="flex-1 text-sm text-muted">{c.label} · {c.kind === "percent" ? `${c.value}% off` : `${money(c.value)} off`}{c.trips.length ? ` · ${c.trips.length} trips` : " · all trips"}</span>
              <span className="text-right text-xs text-muted">Used {c.used}{c.maxUses !== null ? `/${c.maxUses}` : ""}<br />{c.revenue ? `${money(c.revenue)} booked` : ""}</span>
            </button>
          );
        }) : <Empty title="No discount codes yet.">Create one for a festival offer, a returning traveller or a partner.</Empty>}
      </div>
      <Card title={edit?.id ? "Edit code" : "New code"} className="lg:sticky lg:top-6 lg:self-start" info={<>To promote a code, add it to an Offer (Website → Offers) so it shows on the website, then send it to subscribers from Newsletter. The saving is always checked and applied on the server.</>}>
        {(() => {
          const v = edit?.v ?? blank;
          const set = (k: keyof typeof blank, val: unknown) => setEdit({ id: edit?.id ?? null, v: { ...v, [k]: val } });
          return (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveDiscount(edit?.id ?? null, v); setMsg(r.ok ? "Saved." : r.error); if (r.ok) { setEdit(null); router.refresh(); } }); }}>
              <div><Label htmlFor="dc">Code</Label><input id="dc" value={v.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className={`${inputClass} font-mono uppercase`} placeholder="DASHAIN10" required /></div>
              <div><Label htmlFor="dl">Name (for you and the traveller)</Label><input id="dl" value={v.label} onChange={(e) => set("label", e.target.value)} className={inputClass} placeholder="Dashain festival offer" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="dk">Type</Label><select id="dk" value={v.kind} onChange={(e) => set("kind", e.target.value)} className={inputClass}><option value="percent">% off</option><option value="fixed">$ off</option></select></div>
                <div><Label htmlFor="dv">{v.kind === "percent" ? "Percent" : "USD per booking"}</Label><input id="dv" type="number" min={1} step={v.kind === "percent" ? 1 : 10} value={v.value} onChange={(e) => set("value", Number(e.target.value))} className={inputClass} required /></div>
                <div><Label htmlFor="ds">Starts</Label><input id="ds" type="date" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={inputClass} /></div>
                <div><Label htmlFor="de">Ends</Label><input id="de" type="date" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={inputClass} /></div>
                <div><Label htmlFor="dm">Max uses</Label><input id="dm" type="number" min={1} value={v.maxUses} onChange={(e) => set("maxUses", e.target.value)} className={inputClass} placeholder="No limit" /></div>
                <div><Label htmlFor="dp" info="The code only works when at least this many people travel.">Min. travellers</Label><input id="dp" type="number" min={1} value={v.minPax} onChange={(e) => set("minPax", Number(e.target.value))} className={inputClass} /></div>
              </div>
              <FieldView field={{ name: "trips", label: "Only for these trips", type: "multiselect", help: "Leave empty and the code works on every trip." }} value={v.trips} onChange={(x) => set("trips", x)} ctx={{ options: { trips }, data: {}, siteUrl: "", urlPattern: null }} />
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[var(--pine)]" /> Switched on</label>
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className="flex-1 rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save code"}</button>
                {edit?.id ? <button type="button" disabled={pending} onClick={() => start(async () => { if (!confirm("Delete this code?")) return; const r = await deleteDiscount(edit.id!); if (r.ok) { setEdit(null); router.refresh(); } else setMsg(r.error); })} className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700">Delete</button> : null}
                {edit ? <button type="button" onClick={() => setEdit(null)} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold">New</button> : null}
              </div>
              {msg ? <p role="status" className="text-sm">{msg}</p> : null}
            </form>
          );
        })()}
      </Card>
    </div>
  );
}
