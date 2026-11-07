"use client";

import { useState, useTransition } from "react";
import { Check, UserPlus } from "lucide-react";
import { Card, inputClass } from "@/components/admin/ui";
import { officeAddMember, officeRemoveMember, setBookingLang, toggleDocDone } from "./portal-actions";

type Doc = { key: string; label: string; have: number; need: number; done: boolean; byOffice: boolean };
type Person = { id: string | null; name: string; email: string; lead: boolean; joined: boolean; packed: number; total: number; details: number; info?: [string, string][] };

/** Is the group ready? Documents, who has access, packing progress, receipt language. */
export function Readiness({ bookingId, docs, people, pax, lang, source, canInvite, detailFields }: { bookingId: string; docs: Doc[]; people: Person[]; pax: number; lang: string; source: string | null; canInvite: boolean; detailFields: number }) {
  const [msg, setMsg] = useState("");
  const [v, setV] = useState({ name: "", email: "" });
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ message: string }>) => start(async () => setMsg((await fn()).message));
  const ready = docs.filter((d) => d.done).length;
  const room = Math.max(0, pax - people.length);
  return (
    <Card title="Trip readiness" info="What the travellers have done on their trip page: documents (tick an item if it reached you by email or WhatsApp), who in the group has their own sign-in, how far each person is with their packing list and details. Missing documents are reminded automatically (Settings → Features).">
      <div className="space-y-5 text-sm">
        <div>
          <div className="flex items-center justify-between"><p className="font-semibold">Documents</p><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ready === docs.length ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{ready} of {docs.length}</span></div>
          <ul className="mt-2 space-y-1.5">
            {docs.map((d) => (
              <li key={d.key} className="flex items-center gap-2">
                <span className={`grid size-5 shrink-0 place-items-center rounded-full ${d.done ? "bg-pine text-white" : "border-2 border-amber-400"}`} aria-hidden>{d.done ? <Check className="size-3" strokeWidth={3} /> : null}</span>
                <span className="min-w-0 flex-1 truncate">{d.label}<span className="text-xs text-muted"> · {d.byOffice ? "received by office" : `${d.have}/${d.need}`}</span></span>
                {!d.done || d.byOffice ? <button type="button" disabled={pending} onClick={() => run(() => toggleDocDone(bookingId, d.key, !d.byOffice))} className="shrink-0 text-xs font-semibold text-pine hover:underline">{d.byOffice ? "Untick" : "Mark received"}</button> : null}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold">Group ({people.length} of {pax} with access)</p>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {people.map((p) => (
              <li key={p.email} className="px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold">{p.name}{p.lead ? <span className="ml-1 text-xs font-normal text-muted">lead</span> : null}</span>
                  {!p.lead && p.id ? <button type="button" disabled={pending} onClick={() => { if (confirm(`Remove ${p.name}'s access?`)) run(() => officeRemoveMember(bookingId, p.id!)); }} className="shrink-0 text-xs font-semibold text-muted hover:text-red-600">Remove</button> : null}
                </div>
                <p className="truncate text-xs text-muted">{p.email} · {p.joined ? "signed in" : "invited"}</p>
                {p.info?.length ? (
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer font-semibold text-pine">Their details</summary>
                    <dl className="mt-1 grid grid-cols-[7rem_1fr] gap-x-2 gap-y-0.5">{p.info.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="break-words">{v}</dd></div>)}</dl>
                  </details>
                ) : null}
                <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px] text-muted">
                  <span>Packing {p.total ? Math.round((p.packed / p.total) * 100) : 0}%<span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-line"><span className="block h-full bg-pine" style={{ width: `${p.total ? (p.packed / p.total) * 100 : 0}%` }} /></span></span>
                  <span>Details {p.details}/{detailFields}<span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-line"><span className="block h-full bg-pine" style={{ width: `${(p.details / detailFields) * 100}%` }} /></span></span>
                </div>
              </li>
            ))}
          </ul>
          {canInvite && room > 0 ? (
            <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await officeAddMember(bookingId, v); setMsg(r.message); if (r.ok) setV({ name: "", email: "" }); }); }}>
              <input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Name" aria-label="Name" className={inputClass} />
              <div className="flex gap-2">
                <input required type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} placeholder="Email" aria-label="Email" className={inputClass} />
                <button disabled={pending} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pine px-3 text-xs font-semibold text-white disabled:opacity-50"><UserPlus className="size-3.5" aria-hidden />Invite</button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bk-lang" className="text-xs font-semibold text-muted">Receipts in</label>
            <select id="bk-lang" defaultValue={lang} disabled={pending} onChange={(e) => run(() => setBookingLang(bookingId, e.target.value))} className={inputClass}><option value="en">English</option><option value="de">Deutsch</option><option value="fr">Français</option><option value="es">Español</option></select>
          </div>
          <div><p className="text-xs font-semibold text-muted">Came from</p><p className="mt-2 font-semibold">{source ?? "Not known"}</p></div>
        </div>
        {msg ? <p role="status" className="text-xs font-semibold text-pine">{msg}</p> : null}
      </div>
    </Card>
  );
}
