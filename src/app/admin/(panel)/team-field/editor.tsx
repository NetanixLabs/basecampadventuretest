"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { deleteGuide, saveGuide } from "./actions";

type V = { name: string; role: string; phone: string; email: string; languages: string; licenceNo: string; notes: string; active: boolean };
const EMPTY: V = { name: "", role: "guide", phone: "", email: "", languages: "English, Nepali", licenceNo: "", notes: "", active: true };

export function GuideEditor({ id, initial }: { id: string | null; initial: V | null }) {
  const router = useRouter();
  const [v, setV] = useState<V>(initial ?? EMPTY);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title={id ? `Edit ${initial?.name}` : "Add someone"}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveGuide(id, v); setMsg(r.message); if (r.ok) { if (!id) setV(EMPTY); router.push("/team-field"); router.refresh(); } }); }}>
        <div><Label htmlFor="g-n">Name</Label><input id="g-n" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputClass} /></div>
        <div><Label htmlFor="g-r">Role</Label><select id="g-r" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} className={inputClass}><option value="guide">Guide</option><option value="leader">Trip leader</option><option value="porter">Porter</option><option value="driver">Driver</option><option value="cook">Cook</option><option value="other">Other</option></select></div>
        <div><Label htmlFor="g-p">Phone / WhatsApp</Label><input id="g-p" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className={inputClass} placeholder="+977 98…" /></div>
        <div><Label htmlFor="g-e">Email</Label><input id="g-e" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} className={inputClass} /></div>
        <div><Label htmlFor="g-l" info="Separate with commas.">Languages</Label><input id="g-l" value={v.languages} onChange={(e) => setV({ ...v, languages: e.target.value })} className={inputClass} /></div>
        <div><Label htmlFor="g-li">Guide licence no.</Label><input id="g-li" value={v.licenceNo} onChange={(e) => setV({ ...v, licenceNo: e.target.value })} className={inputClass} /></div>
        <div><Label htmlFor="g-no">Notes</Label><textarea id="g-no" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} className={inputClass} placeholder="First aid trained, speaks German, best for Everest…" /></div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="size-4 accent-[var(--pine)]" /> Active</label>
        <div className="flex flex-wrap gap-2">
          <button disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{id ? "Save" : "Add to team"}</button>
          {id ? <button type="button" onClick={() => router.push("/team-field")} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold">Cancel</button> : null}
          {id ? <button type="button" disabled={pending} onClick={() => start(async () => { if (!confirm("Remove this person? Their past assignments are removed too. To keep history, untick Active instead.")) return; const r = await deleteGuide(id); setMsg(r.message); router.push("/team-field"); router.refresh(); })} className="rounded-full px-3 py-2.5 text-sm font-semibold text-muted hover:text-red-600">Remove</button> : null}
        </div>
        {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      </form>
    </Card>
  );
}
