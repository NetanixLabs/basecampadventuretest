"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, inputClass } from "@/components/admin/ui";
import { assignStaff, removeStaff, saveDepartureNotes } from "../actions";

const ROLE: Record<string, string> = { guide: "Guide", leader: "Trip leader", porter: "Porter", driver: "Driver", cook: "Cook", other: "Other" };

export function StaffPlanner({ depKey, staff, team, notes: n0 }: { depKey: string; staff: { id: string; name: string; role: string; phone: string | null }[]; team: { id: string; name: string; role: string }[]; notes: string }) {
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [role, setRole] = useState("guide");
  const [notes, setNotes] = useState(n0);
  const [msg, setMsg] = useState("");
  const [clash, setClash] = useState("");
  const [pending, start] = useTransition();
  const assign = (force: boolean) => start(async () => { const r = await assignStaff(depKey, pick, role, force); if (r.clash) { setClash(r.clash); return; } setClash(""); setMsg(r.message); if (r.ok) setPick(""); router.refresh(); });
  return (
    <div className="space-y-6">
      {msg ? <p role="status" className="rounded-xl bg-pine/8 px-4 py-2.5 text-sm text-pine">{msg}</p> : null}
      <Card title="Field team" info="Who leads and supports this group. Their names and phone numbers go on the departure list.">
        {staff.length ? (
          <ul className="mb-4 divide-y divide-line text-sm">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                <span><strong>{s.name}</strong> <span className="text-muted">· {ROLE[s.role]}{s.phone ? ` · ${s.phone}` : ""}</span></span>
                <button disabled={pending} onClick={() => start(async () => { await removeStaff(depKey, s.id); router.refresh(); })} className="text-xs font-semibold text-muted hover:text-red-600">Remove</button>
              </li>
            ))}
          </ul>
        ) : <p className="mb-4 text-sm text-muted">Nobody assigned yet.</p>}
        <div className="space-y-2">
          <select aria-label="Person" value={pick} onChange={(e) => { setPick(e.target.value); const t = team.find((x) => x.id === e.target.value); if (t) setRole(t.role); setClash(""); }} className={inputClass}>
            <option value="">Choose someone…</option>
            {team.filter((t) => !staff.some((s) => s.id === t.id)).map((t) => <option key={t.id} value={t.id}>{t.name} ({ROLE[t.role]})</option>)}
          </select>
          <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button disabled={!pick || pending} onClick={() => assign(false)} className="w-full rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Assign</button>
          {clash ? (
            <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <p><strong>Double booking:</strong> {clash}</p>
              <button onClick={() => assign(true)} className="mt-2 font-semibold underline">Assign anyway</button>
            </div>
          ) : null}
        </div>
      </Card>
      <Card title="Notes for this departure">
        <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} aria-label="Notes" placeholder="Hotel, flights to Lukla, permits, special requests…" />
        <button disabled={pending} onClick={() => start(async () => setMsg((await saveDepartureNotes(depKey, notes)).message))} className="mt-2 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine">Save notes</button>
      </Card>
    </div>
  );
}
