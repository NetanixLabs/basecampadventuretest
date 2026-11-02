"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { saveReceiptSettings } from "./actions";

type V = { signatory: string; signatoryTitle: string; vatMode: "none" | "included" | "added"; vatRate: number; receiptPrefix: string; billPrefix: string; footerNote: string; bankDetails: string };

function ImageSlot({ kind, label, has, hint }: { kind: "signature" | "stamp"; label: string; has: boolean; hint: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState(0);
  async function upload(f: File) {
    setBusy(true);
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", f);
    const r = await fetch("/api/receipt-brand/", { method: "POST", body }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    setMsg(r?.ok ? "Saved." : j.error ?? "Upload failed.");
    setV((x) => x + 1);
    router.refresh();
  }
  async function remove() {
    if (!confirm(`Remove the ${kind}?`)) return;
    await fetch(`/api/receipt-brand/?kind=${kind}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      <div className="mt-3 grid h-36 place-items-center rounded-xl bg-[repeating-conic-gradient(#f1f4f5_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {has ? <img src={`/api/receipt-brand/?kind=${kind}&v=${v}`} alt={label} className="max-h-32 max-w-full object-contain" /> : <span className="text-sm text-muted">Not added yet</span>}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine disabled:opacity-50">{busy ? "Uploading…" : has ? "Replace" : "Upload"}</button>
        {has ? <button type="button" onClick={remove} className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-red-600">Remove</button> : null}
      </div>
      {msg ? <p role="status" className="mt-2 text-sm">{msg}</p> : null}
    </div>
  );
}

export function ReceiptSettingsForm({ initial, has }: { initial: V; has: { signature: boolean; stamp: boolean } }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      <Card title="Signature and stamp" info="Scan or photograph them on white paper; a PNG with a transparent background looks best. Empty borders are trimmed automatically.">
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageSlot kind="signature" label="Authorised signature" has={has.signature} hint="Signature of the person who signs receipts." />
          <ImageSlot kind="stamp" label="Company stamp / seal" has={has.stamp} hint="Round company stamp, placed next to the signature." />
        </div>
      </Card>
      <form onSubmit={(e) => { e.preventDefault(); start(async () => setMsg((await saveReceiptSettings(v)).message)); }} className="space-y-6">
        <Card title="Details on every receipt">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="rs-n">Signed by (name)</Label><input id="rs-n" value={v.signatory} onChange={(e) => setV({ ...v, signatory: e.target.value })} className={inputClass} /></div>
            <div><Label htmlFor="rs-t">Title</Label><input id="rs-t" value={v.signatoryTitle} onChange={(e) => setV({ ...v, signatoryTitle: e.target.value })} className={inputClass} /></div>
            <div>
              <Label htmlFor="rs-vm" info="None: no VAT line. Included: the price already contains VAT and the receipt shows how much. Added: VAT is added on top of the price (manual bills).">VAT</Label>
              <select id="rs-vm" value={v.vatMode} onChange={(e) => setV({ ...v, vatMode: e.target.value as V["vatMode"] })} className={inputClass}><option value="none">No VAT line</option><option value="included">VAT included in the price</option><option value="added">VAT added on top</option></select>
            </div>
            <div><Label htmlFor="rs-vr">VAT rate (%)</Label><input id="rs-vr" inputMode="decimal" value={v.vatRate} onChange={(e) => setV({ ...v, vatRate: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} className={inputClass} /></div>
            <div><Label htmlFor="rs-rp" info="Receipts are numbered automatically: prefix, year and a running number, e.g. BCA-R-2026-0001.">Receipt number prefix</Label><input id="rs-rp" value={v.receiptPrefix} onChange={(e) => setV({ ...v, receiptPrefix: e.target.value.toUpperCase() })} className={`${inputClass} font-mono`} /></div>
            <div><Label htmlFor="rs-bp">Bill number prefix</Label><input id="rs-bp" value={v.billPrefix} onChange={(e) => setV({ ...v, billPrefix: e.target.value.toUpperCase() })} className={`${inputClass} font-mono`} /></div>
            <div className="sm:col-span-2"><Label htmlFor="rs-bd" info="Printed on bills so travellers can pay by bank transfer. Leave empty to hide.">Bank details (bills)</Label><textarea id="rs-bd" rows={3} value={v.bankDetails} onChange={(e) => setV({ ...v, bankDetails: e.target.value })} className={inputClass} /></div>
            <div className="sm:col-span-2"><Label htmlFor="rs-f">Note at the bottom</Label><textarea id="rs-f" rows={2} value={v.footerNote} onChange={(e) => setV({ ...v, footerNote: e.target.value })} className={inputClass} /></div>
          </div>
        </Card>
        <div className="flex items-center gap-3">
          <button disabled={pending} className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save receipt settings"}</button>
          {msg ? <p role="status" className="text-sm">{msg}</p> : null}
        </div>
      </form>
    </div>
  );
}
