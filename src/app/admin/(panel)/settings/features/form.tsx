"use client";

import { useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { LANGS, type Features } from "@/lib/features";
import { saveFeatures } from "./actions";
import { cn } from "@/lib/utils";

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-pine" : "bg-line")}>
      <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
    </button>
  );
}

function Feature({ title, info, on, onChange, children }: { title: string; info: string; on: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <Card title={title} info={info} actions={<Switch on={on} onChange={onChange} label={`${title} on/off`} />}>
      <div className={cn("space-y-4", !on && "pointer-events-none opacity-45")}>{children ?? <p className="text-sm text-muted">{on ? "On." : "Off."}</p>}</div>
    </Card>
  );
}

export function FeaturesForm({ initial, whatsappKeys }: { initial: Features; whatsappKeys: { meta: boolean; callmebot: boolean } }) {
  const [f, setF] = useState(initial);
  const [secrets, setSecrets] = useState({ WHATSAPP_TOKEN: "", WHATSAPP_PHONE_ID: "", CALLMEBOT_KEYS: "" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof Features>(k: K, v: Partial<Features[K]>) => setF((o) => ({ ...o, [k]: { ...o[k], ...v } }));
  const num = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0;

  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveFeatures(f, secrets); setMsg(r.message); if (r.ok) setSecrets({ WHATSAPP_TOKEN: "", WHATSAPP_PHONE_ID: "", CALLMEBOT_KEYS: "" }); }); }} className="space-y-6 pb-24 lg:pb-0">
      <div className="grid gap-6 lg:grid-cols-2">
        <Feature title="Reminder for unpaid bookings" info="If a traveller starts a booking but hasn't paid on WeTravel after this many hours, they get one friendly reminder with their payment link." on={f.abandoned.enabled} onChange={(v) => set("abandoned", { enabled: v })}>
          <div><Label htmlFor="ab-h">Send after (hours)</Label><input id="ab-h" inputMode="numeric" value={f.abandoned.afterHours} onChange={(e) => set("abandoned", { afterHours: num(e.target.value) })} className={inputClass} /></div>
        </Feature>

        <Feature title="Reviews after the trip" info="After the trip ends, travellers get an email with 1–5 stars. Their review waits for your approval under Reviews & videos → Traveller reviews, then appears on the trip page." on={f.reviews.enabled} onChange={(v) => set("reviews", { enabled: v })}>
          <div><Label htmlFor="rv-d">Days after the trip ends</Label><input id="rv-d" inputMode="numeric" value={f.reviews.afterDays} onChange={(e) => set("reviews", { afterDays: num(e.target.value) })} className={inputClass} /></div>
        </Feature>

        <Feature title="Traveller accounts (my.basecampadventure.com)" info="Only for bookings with a payment received. The office creates the account from the booking page (or automatically, if switched on below). The traveller sets their own password from a one-time link. Accounts and their documents are deleted after the trip." on={f.portal.enabled} onChange={(v) => set("portal", { enabled: v })}>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">Create and invite automatically when payment arrives<Switch on={f.portal.autoInvite} onChange={(v) => set("portal", { autoInvite: v })} label="Automatic invite" /></label>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="pt-e" info="The account and its documents are removed this many days after the trip ends.">Close after trip (days)</Label><input id="pt-e" inputMode="numeric" value={f.portal.expiryDays} onChange={(e) => set("portal", { expiryDays: num(e.target.value) })} className={inputClass} /></div>
            <div><Label htmlFor="pt-i">Invite link works for (hours)</Label><input id="pt-i" inputMode="numeric" value={f.portal.inviteHours} onChange={(e) => set("portal", { inviteHours: num(e.target.value) })} className={inputClass} /></div>
          </div>
        </Feature>

        <Feature title="Emails before the trip" info="Automatic emails to travellers with a payment: one month before (visa, insurance, flights, packing) and one week before (airport pickup). If a balance is still open, the amount and the pay-now link are included. Change the wording under Email templates." on={f.pretrip.enabled} onChange={(v) => set("pretrip", { enabled: v })}>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">30 days before<Switch on={f.pretrip.d30} onChange={(v) => set("pretrip", { d30: v })} label="30 days before" /></label>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">7 days before<Switch on={f.pretrip.d7} onChange={(v) => set("pretrip", { d7: v })} label="7 days before" /></label>
        </Feature>

        <Feature title="Traveller details in tawk.to chat" info="When someone books or sends an enquiry, their name, email and reference are added to their tawk.to chat, so your team knows who they are talking to." on={f.tawk.details} onChange={(v) => set("tawk", { details: v })} />

        <Feature title="WhatsApp alerts to the office" info="A WhatsApp message to the office for new bookings, enquiries and payments. CallMeBot is free and quick to set up for a personal number; Meta's WhatsApp Business API is the official option for a business number (needs an approved message template)." on={f.whatsapp.enabled} onChange={(v) => set("whatsapp", { enabled: v })}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="wa-p">Service</Label><select id="wa-p" value={f.whatsapp.provider} onChange={(e) => set("whatsapp", { provider: e.target.value as "callmebot" | "meta" })} className={inputClass}><option value="callmebot">CallMeBot (simple)</option><option value="meta">WhatsApp Business API (Meta)</option></select></div>
            <div><Label htmlFor="wa-r" info="With country code, e.g. 9779851029616. Separate several with commas.">Send to</Label><input id="wa-r" value={f.whatsapp.recipients} onChange={(e) => set("whatsapp", { recipients: e.target.value })} className={`${inputClass} font-mono`} placeholder="9779851029616" /></div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {(["booking", "enquiry", "payment"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 font-semibold capitalize"><input type="checkbox" checked={f.whatsapp[k]} onChange={(e) => set("whatsapp", { [k]: e.target.checked })} className="size-4 accent-[var(--pine)]" /> New {k}</label>
            ))}
          </div>
          {f.whatsapp.provider === "callmebot" ? (
            <div><Label htmlFor="wa-k" info="Each phone gets its own key from CallMeBot (send 'I allow callmebot to send me messages' to their number). Enter one key per recipient, in the same order, separated by commas.">CallMeBot key(s) {whatsappKeys.callmebot ? "· saved" : ""}</Label><input id="wa-k" type="password" autoComplete="off" value={secrets.CALLMEBOT_KEYS} onChange={(e) => setSecrets({ ...secrets, CALLMEBOT_KEYS: e.target.value })} className={`${inputClass} font-mono`} placeholder={whatsappKeys.callmebot ? "•••• saved (type to replace)" : "123456"} /></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="wa-t">Access token {whatsappKeys.meta ? "· saved" : ""}</Label><input id="wa-t" type="password" autoComplete="off" value={secrets.WHATSAPP_TOKEN} onChange={(e) => setSecrets({ ...secrets, WHATSAPP_TOKEN: e.target.value })} className={`${inputClass} font-mono`} placeholder={whatsappKeys.meta ? "•••• saved" : ""} /></div>
              <div><Label htmlFor="wa-i">Phone number ID</Label><input id="wa-i" value={secrets.WHATSAPP_PHONE_ID} onChange={(e) => setSecrets({ ...secrets, WHATSAPP_PHONE_ID: e.target.value })} className={`${inputClass} font-mono`} placeholder={whatsappKeys.meta ? "saved" : ""} /></div>
              <div><Label htmlFor="wa-tm" info="An approved template with one text variable ({{1}}) for the message.">Template name</Label><input id="wa-tm" value={f.whatsapp.template} onChange={(e) => set("whatsapp", { template: e.target.value })} className={inputClass} /></div>
              <div><Label htmlFor="wa-l">Template language</Label><input id="wa-l" value={f.whatsapp.language} onChange={(e) => set("whatsapp", { language: e.target.value })} className={inputClass} /></div>
            </div>
          )}
        </Feature>

        <Card title="Payments" info="Choose how travellers pay. WeTravel is the main checkout. Himalayan Bank (HBL) is a second card option; switch it on only after its keys are entered in Settings → Keys and a sandbox test payment worked. If both are on, travellers choose at checkout; the preferred one is selected first.">
          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3 font-semibold">WeTravel<Switch on={f.payments.wetravel} onChange={(v) => set("payments", { wetravel: v })} label="WeTravel on/off" /></label>
            <label className="flex items-center justify-between gap-3 font-semibold">Himalayan Bank (cards)<Switch on={f.payments.hbl} onChange={(v) => set("payments", { hbl: v })} label="HBL on/off" /></label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div><Label htmlFor="pay-pref">Preferred</Label><select id="pay-pref" value={f.payments.preferred} onChange={(e) => set("payments", { preferred: e.target.value as "wetravel" | "hbl" })} className={inputClass}><option value="wetravel">WeTravel</option><option value="hbl">Himalayan Bank</option></select></div>
              <div><Label htmlFor="pay-cur" info="The currency HBL charges in. Bookings are always kept in US dollars; NPR uses the rate on the right.">HBL charges in</Label><select id="pay-cur" value={f.payments.hblCurrency} onChange={(e) => set("payments", { hblCurrency: e.target.value as "USD" | "NPR" })} className={inputClass}><option value="USD">US dollars</option><option value="NPR">Nepali rupees</option></select></div>
              {f.payments.hblCurrency === "NPR" ? <div className="col-span-2"><Label htmlFor="pay-rate">1 US$ = NPR</Label><input id="pay-rate" inputMode="decimal" value={f.payments.nprRate} onChange={(e) => set("payments", { nprRate: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} className={inputClass} /></div> : null}
            </div>
          </div>
        </Card>

        <Card title="Languages" info="Turn on a language to publish the trips translated into it (Trips → a trip → Translations). Only trips with a published translation get a page in that language, with proper language tags for Google.">
          <ul className="space-y-3">
            {(Object.keys(LANGS) as (keyof typeof LANGS)[]).map((l) => (
              <li key={l} className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{LANGS[l]} <span className="font-mono text-xs text-muted">/{l}/</span></span><Switch on={f.languages[l]} onChange={(v) => set("languages", { [l]: v })} label={`${LANGS[l]} on/off`} /></li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-card px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <button type="submit" disabled={pending} className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save features"}</button>
        {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      </div>
    </form>
  );
}
