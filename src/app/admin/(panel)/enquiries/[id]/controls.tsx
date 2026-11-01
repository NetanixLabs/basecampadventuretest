"use client";

import { useState, useTransition } from "react";
import { Card, inputClass } from "@/components/admin/ui";
import { updateEnquiry } from "../../sales-actions";
import type { EnquiryStatus } from "@/generated/prisma/browser";

const STATUSES: { v: EnquiryStatus; l: string }[] = [
  { v: "new", l: "New" }, { v: "replied", l: "Replied" }, { v: "quoted", l: "Quote sent" }, { v: "won", l: "Booked (won)" }, { v: "lost", l: "Not going ahead" }, { v: "spam", l: "Spam" },
];

export function EnquiryControls({ id, status: s0, notes: n0 }: { id: string; status: EnquiryStatus; notes: string }) {
  const [status, setStatus] = useState(s0);
  const [notes, setNotes] = useState(n0);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title="Follow-up">
      <label className="text-sm font-semibold" htmlFor="st">Status</label>
      <select id="st" value={status} onChange={(e) => setStatus(e.target.value as EnquiryStatus)} className={`${inputClass} mt-1.5`}>{STATUSES.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</select>
      <label className="mt-4 block text-sm font-semibold" htmlFor="nt">Private notes</label>
      <textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className={`${inputClass} mt-1.5`} placeholder="Only the team sees this." />
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await updateEnquiry(id, status, notes); setMsg(r.ok ? "Saved." : r.error); })} className="mt-3 w-full rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
      {msg ? <p className="mt-2 text-sm" role="status">{msg}</p> : null}
    </Card>
  );
}
