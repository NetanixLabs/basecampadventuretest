"use client";

import { useState, useTransition } from "react";
import { Card, Help, inputClass, Label } from "@/components/admin/ui";
import { sendCampaign } from "./actions";

export function Composer() {
  const [v, setV] = useState({ subject: "", heading: "", body: "", button: "See the offer", buttonUrl: "https://basecampadventure.com/" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v, x: string) => setV({ ...v, [k]: x });
  const send = (test: boolean) => start(async () => {
    if (!test && !confirm("Send this to every subscriber now? This can't be undone.")) return;
    const r = await sendCampaign({ ...v, test });
    setMsg(r.ok ? r.message : r.error);
  });
  return (
    <Card title="Send an offer or newsletter" description="Branded like every Base Camp email, with an unsubscribe link." className="lg:sticky lg:top-6 lg:self-start">
      <div className="space-y-4">
        <div><Label htmlFor="cs">Subject</Label><input id="cs" value={v.subject} onChange={(e) => set("subject", e.target.value)} className={inputClass} placeholder="Dashain offer: 10% off Everest treks" /></div>
        <div><Label htmlFor="ch">Heading</Label><input id="ch" value={v.heading} onChange={(e) => set("heading", e.target.value)} className={inputClass} placeholder="Celebrate Dashain in the Himalayas" /></div>
        <div><Label htmlFor="cb">Message</Label><textarea id="cb" rows={8} value={v.body} onChange={(e) => set("body", e.target.value)} className={inputClass} placeholder={"Namaste!\n\nThis Dashain, enjoy **10% off** every Everest trek with the code DASHAIN10.\n\n- Valid for departures until 31 December\n- Book by 15 October"} /><Help>Blank line = new paragraph. Start lines with "- " for a list. **Bold** works.</Help></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="cbt">Button</Label><input id="cbt" value={v.button} onChange={(e) => set("button", e.target.value)} className={inputClass} /></div>
          <div><Label htmlFor="cbu">Button link</Label><input id="cbu" value={v.buttonUrl} onChange={(e) => set("buttonUrl", e.target.value)} className={inputClass} /></div>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => send(true)} className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-pine disabled:opacity-50">Send me a test</button>
          <button type="button" disabled={pending} onClick={() => send(false)} className="flex-1 rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Sending…" : "Send to all"}</button>
        </div>
        {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      </div>
    </Card>
  );
}
