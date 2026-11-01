"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Card, Help, inputClass, Label } from "@/components/admin/ui";
import { previewTemplate, resetTemplate, saveTemplate, testTemplate } from "../actions";

type V = { subject: string; heading: string; body: string; button: string; enabled: boolean };

export function TemplateEditor({ keyName, vars, initial, edited }: { keyName: string; vars: string[]; initial: V; edited: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [html, setHtml] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    const t = setTimeout(() => void previewTemplate(keyName, v).then(setHtml), 300);
    return () => clearTimeout(t);
  }, [keyName, v]);
  const set = (k: keyof V, x: string | boolean) => setV({ ...v, [k]: x });
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Wording">
        <div className="space-y-4">
          <div><Label htmlFor="s">Subject line</Label><input id="s" value={v.subject} onChange={(e) => set("subject", e.target.value)} className={inputClass} /></div>
          <div><Label htmlFor="h">Heading</Label><input id="h" value={v.heading} onChange={(e) => set("heading", e.target.value)} className={inputClass} /></div>
          <div><Label htmlFor="b">Text</Label><textarea id="b" rows={10} value={v.body} onChange={(e) => set("body", e.target.value)} className={inputClass} /><Help>Blank line = new paragraph. "- " starts a list. **bold**. Booking details and the button are added automatically.</Help></div>
          <div><Label htmlFor="bt">Button label</Label><input id="bt" value={v.button} onChange={(e) => set("button", e.target.value)} className={inputClass} /></div>
          {vars.length ? <div className="rounded-xl bg-pine/5 p-3 text-xs"><p className="font-semibold">Placeholders you can use</p><p className="mt-1 flex flex-wrap gap-1.5">{vars.map((x) => <button key={x} type="button" onClick={() => set("body", `${v.body}{{${x}}}`)} className="rounded-md bg-card px-1.5 py-0.5 font-mono ring-1 ring-line hover:ring-pine">{`{{${x}}}`}</button>)}</p></div> : null}
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={v.enabled} onChange={(e) => set("enabled", e.target.checked)} className="size-4 accent-[var(--pine)]" /> Send this email</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => start(async () => { const r = await saveTemplate(keyName, v); setMsg(r.message); router.refresh(); })} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save</button>
            <button type="button" disabled={pending} onClick={() => start(async () => { const r = await testTemplate(keyName, v); setMsg(r.message); })} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-pine">Send me a test</button>
            {edited ? <button type="button" disabled={pending} onClick={() => start(async () => { if (!confirm("Go back to the original wording?")) return; await resetTemplate(keyName); router.refresh(); location.reload(); })} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted hover:text-pine">Restore original</button> : null}
          </div>
          {msg ? <p role="status" className="text-sm">{msg}</p> : null}
        </div>
      </Card>
      <Card title="Preview" description="With example details. Real emails use the traveller's own.">
        <iframe title="Email preview" srcDoc={html} sandbox="" className="h-[44rem] w-full rounded-xl border border-line bg-[#f3f7f8]" />
      </Card>
    </div>
  );
}
