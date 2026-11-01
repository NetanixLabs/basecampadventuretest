"use client";

import { useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { saveSettings } from "../system-actions";

export function SettingsForm({ initial }: { initial: { tawkProperty: string; tawkWidget: string; ga4: string } }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title="Website integrations">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveSettings(v); setMsg(r.ok ? r.message ?? "Saved." : r.error); }); }}>
        <div>
          <Label htmlFor="tp" info={<>tawk.to → Administration → Chat Widget: the long ID in the widget code (after embed.tawk.to/). The chat bubble sits bottom-right, WhatsApp bottom-left, so they never overlap.</>}>tawk.to Property ID</Label>
          <input id="tp" value={v.tawkProperty} onChange={(e) => setV({ ...v, tawkProperty: e.target.value })} className={`${inputClass} font-mono`} placeholder="5f1a2b3c4d5e6f7a8b9c0d1e" />
        </div>
        <div><Label htmlFor="tw">tawk.to Widget ID</Label><input id="tw" value={v.tawkWidget} onChange={(e) => setV({ ...v, tawkWidget: e.target.value })} className={`${inputClass} font-mono`} placeholder="default" /></div>
        <div><Label htmlFor="ga" info={<>The old site used G-XGW9MS2DX0. Keep it to keep your history.</>}>Google Analytics 4 ID</Label><input id="ga" value={v.ga4} onChange={(e) => setV({ ...v, ga4: e.target.value })} className={`${inputClass} font-mono`} placeholder="G-XGW9MS2DX0" /></div>
        <button type="submit" disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      </form>
    </Card>
  );
}
