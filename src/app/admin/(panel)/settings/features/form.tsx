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
        <Feature title="Reminders for unpaid bookings" info="If a traveller starts a booking but hasn't paid after this many hours, they get a friendly reminder with their payment link. A second, more personal reminder can follow a few days later, optionally with a small discount code (make the code under Sales → Discount codes first)." on={f.abandoned.enabled} onChange={(v) => set("abandoned", { enabled: v })}>
          <div><Label htmlFor="ab-h">First reminder after (hours)</Label><input id="ab-h" inputMode="numeric" value={f.abandoned.afterHours} onChange={(e) => set("abandoned", { afterHours: num(e.target.value) })} className={inputClass} /></div>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">Second reminder<Switch on={f.abandoned.second} onChange={(v) => set("abandoned", { second: v })} label="Second reminder" /></label>
          <div className={cn("grid grid-cols-2 gap-3", !f.abandoned.second && "opacity-45")}>
            <div><Label htmlFor="ab-d2" info="Days after the first reminder.">Days later</Label><input id="ab-d2" inputMode="numeric" value={f.abandoned.secondDays} onChange={(e) => set("abandoned", { secondDays: num(e.target.value) })} className={inputClass} /></div>
            <div><Label htmlFor="ab-c" info="Optional. Leave empty for no discount.">Discount code</Label><input id="ab-c" value={f.abandoned.secondCode} onChange={(e) => set("abandoned", { secondCode: e.target.value.toUpperCase() })} className={`${inputClass} font-mono`} placeholder="e.g. COMEBACK5" /></div>
          </div>
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
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">Day before (pickup time and place, guide's name)<Switch on={f.pretrip.d1} onChange={(v) => set("pretrip", { d1: v })} label="Day before" /></label>
        </Feature>

        <Feature title="Balance reminders" info="Travellers who paid a deposit get a reminder with the pay-now link this many days before the trip, once per stage. Nothing is sent once the balance is paid. The 30-day reminder is skipped while the one-month email is on, because it already shows the balance." on={f.balance.enabled} onChange={(v) => set("balance", { enabled: v })}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="bal-d" info="Days before the start date, separated by commas.">Send at (days before)</Label><input id="bal-d" value={f.balance.days} onChange={(e) => set("balance", { days: e.target.value })} className={`${inputClass} font-mono`} placeholder="60,30,14" /></div>
            <div><Label htmlFor="bal-due" info="Shown to travellers as the due date of the balance in their payment plan. 0 = on arrival.">Balance due (days before)</Label><input id="bal-due" inputMode="numeric" value={f.balance.dueDays} onChange={(e) => set("balance", { dueDays: num(e.target.value) })} className={inputClass} /></div>
          </div>
        </Feature>

        <Feature title="Missing documents reminders" info="Travellers see a document checklist on their trip page: passport copy, passport photo and insurance for each traveller, and the flight tickets. If something is still missing this many days before the trip, everyone in the group gets a reminder email and a phone notification. You can tick an item as received on the booking page if it came by email or WhatsApp." on={f.docs.enabled} onChange={(v) => set("docs", { enabled: v })}>
          <div><Label htmlFor="doc-d" info="Days before the start date, separated by commas.">Send at (days before)</Label><input id="doc-d" value={f.docs.days} onChange={(e) => set("docs", { days: e.target.value })} className={`${inputClass} font-mono`} placeholder="45,21,10" /></div>
        </Feature>

        <Feature title="Phone notifications for travellers" info="Travellers can switch on notifications on their trip page (on iPhone after adding the page to the home screen). They are notified when the office replies, a document or trip photos are added, a payment arrives, and for reminders. No app or phone number needed; the notifications are encrypted." on={f.push.enabled} onChange={(v) => set("push", { enabled: v })} />

        <Feature title="Email guides and porters their assignments" info="When you assign someone to a departure (Operations, Departures), they get an email with the departure list PDF attached: travellers, flights, food needs and medical notes. Only for staff with an email address in Guides & porters." on={f.guideNotify.enabled} onChange={(v) => set("guideNotify", { enabled: v })} />

        <Feature title="Prices in the visitor's currency" info="Trip pages show an approximate price in euros, pounds or Australian dollars next to the US$ price, picked from the visitor's browser language (they can change it). Bookings are always charged in US$. Update the rates now and then." on={f.currency.enabled} onChange={(v) => set("currency", { enabled: v })}>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">Update the rates automatically every day<Switch on={f.currency.auto} onChange={(v) => set("currency", { auto: v })} label="Automatic rates" /></label>
          <p className="text-xs text-muted">{f.currency.auto ? (f.currency.updatedAt ? `Last updated ${new Date(f.currency.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. ` : "Updates within the next hour. ") + "Rates you type below are replaced at the next update." : "Rates are only changed when you change them below."}</p>
          <div className="grid grid-cols-3 gap-3">
            {([["eur", "EUR (€)"], ["gbp", "GBP (£)"], ["aud", "AUD (A$)"]] as const).map(([k, l]) => (
              <div key={k}><Label htmlFor={`fx-${k}`}>{`1 US$ = ${l}`}</Label><input id={`fx-${k}`} inputMode="decimal" value={f.currency[k]} onChange={(e) => set("currency", { [k]: e.target.value as unknown as number })} className={`${inputClass} font-mono`} /></div>
            ))}
          </div>
        </Feature>

        <Feature title="Logo watermark on photos" info="Our logo in the bottom-right corner at low opacity, like the videos, so copied photos still credit us. With &quot;Gallery photos only&quot; the photo itself stays clean and the logo shows only in the photo galleries and in Google Images; banners, sliders and cards stay clean. The upload window has a tick box to leave it off for one upload (for example logos, maps or team portraits)." on={f.watermark.enabled} onChange={(v) => set("watermark", { enabled: v })}>
          <div><Label htmlFor="wm-s">Add it to</Label><select id="wm-s" value={f.watermark.scope} onChange={(e) => set("watermark", { scope: e.target.value as "galleries" | "all" })} className={inputClass}><option value="galleries">Gallery photos only (trip galleries, Gallery page, community)</option><option value="all">Every photo uploaded (added to the photo itself)</option></select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="wm-o" info="15 is very faint, 90 is strong. The videos use about 55.">Strength (%)</Label><input id="wm-o" inputMode="numeric" value={f.watermark.opacity} onChange={(e) => set("watermark", { opacity: num(e.target.value) })} className={inputClass} /></div>
            <div><Label htmlFor="wm-z" info="Logo width as a share of the photo's width. 10 is small and discreet; 5 is the smallest.">Size (% of width)</Label><input id="wm-z" inputMode="numeric" value={f.watermark.size} onChange={(e) => set("watermark", { size: num(e.target.value) })} className={inputClass} /></div>
          </div>
        </Feature>

        <Feature title="Save a trip" info="Visitors tap the heart on trips to keep a shortlist, and can email it to themselves. We send one friendly reminder after the number of days below (only if they ticked the box to hear from us)." on={f.saved.enabled} onChange={(v) => set("saved", { enabled: v })}>
          <div><Label htmlFor="sv-d">Reminder after (days)</Label><input id="sv-d" inputMode="numeric" value={f.saved.reminderDays} onChange={(e) => set("saved", { reminderDays: num(e.target.value) })} className={inputClass} /></div>
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
