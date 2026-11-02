"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/admin/ui";
import { setBookingAgent } from "../../agents/actions";

export function AgentSelect({ bookingId, agentId, agents }: { bookingId: string; agentId: string | null; agents: { id: string; label: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState(agentId ?? "");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title="Agent" info="If a partner agency sent this traveller, link the booking to them so their commission is counted. Bookings from an agent's link are linked automatically.">
      <div className="flex gap-2">
        <select aria-label="Agent" value={v} onChange={(e) => setV(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm">
          <option value="">Direct booking (no agent)</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <button disabled={pending || v === (agentId ?? "")} onClick={() => start(async () => { const r = await setBookingAgent(bookingId, v || null); setMsg(r.message); router.refresh(); })} className="rounded-full border border-line px-4 text-sm font-semibold hover:border-pine disabled:opacity-40">Save</button>
      </div>
      {msg ? <p role="status" className="mt-2 text-sm">{msg}</p> : null}
    </Card>
  );
}
