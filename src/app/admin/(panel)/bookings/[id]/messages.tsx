"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, inputClass } from "@/components/admin/ui";
import { replyToTraveller } from "./portal-actions";

type M = { id: string; fromOffice: boolean; authorName: string; body: string; at: string };

/** Messages with the traveller (also on their trip page). */
export function BookingMessages({ bookingId, messages }: { bookingId: string; messages: M[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title="Messages with the traveller" info="Messages from the traveller's trip page arrive here (and by email to the office). Your reply appears on their trip page and they get an email. Use it for documents, flights or anything about this booking.">
      {messages.length ? (
        <ul className="mb-4 max-h-96 space-y-3 overflow-y-auto pr-1">
          {messages.map((m) => (
            <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.fromOffice ? "ml-auto bg-pine text-white" : "bg-pine/8"}`}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={`mt-1 text-[11px] ${m.fromOffice ? "text-white/75" : "text-muted"}`}>{m.authorName} · {new Date(m.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mb-3 text-sm text-muted">No messages yet.</p>}
      <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await replyToTraveller(bookingId, text); setMsg(r.message); if (r.ok) setText(""); router.refresh(); }); }} className="space-y-2">
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className={inputClass} aria-label="Message" placeholder="e.g. Please upload a clearer copy of your passport photo page." />
        <div className="flex items-center gap-3"><button disabled={pending || text.trim().length < 2} className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">Send</button>{msg ? <span className="text-sm">{msg}</span> : null}</div>
      </form>
    </Card>
  );
}
