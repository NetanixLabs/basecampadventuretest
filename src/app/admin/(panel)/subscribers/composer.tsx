"use client";

import { useEffect, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { FieldView } from "@/components/admin/form/fields";
import { MediaPicker } from "@/components/admin/form/media-field";
import { previewCampaign, sendCampaign, type CampaignInput } from "./actions";

const START: Required<CampaignInput> = {
  subject: "",
  preheader: "",
  heading: "",
  body: "",
  hero: "/photos/hero-gokyo.webp",
  heroAlt: "Gokyo lakes below Cho Oyu",
  offerCode: "",
  offerHeadline: "",
  offerNote: "",
  trips: [],
  button: "Plan my trip",
  buttonUrl: "https://basecampadventure.com/trip/",
};

export function Composer({ trips, codes }: { trips: { value: string; label: string }[]; codes: { code: string; label: string }[] }) {
  const [v, setV] = useState(START);
  const [html, setHtml] = useState("");
  const [picker, setPicker] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof START>(k: K, x: (typeof START)[K]) => setV((o) => ({ ...o, [k]: x }));
  useEffect(() => {
    const t = setTimeout(() => void previewCampaign({ ...v, heading: v.heading || "Your heading", body: v.body || "Your message appears here.", subject: v.subject || "Subject" }).then(setHtml), 350);
    return () => clearTimeout(t);
  }, [v]);
  const send = (test: boolean) => start(async () => {
    if (!test && !confirm("Send this newsletter to every subscriber now? This can't be undone.")) return;
    const r = await sendCampaign(v, test);
    setMsg(r.ok ? r.message : r.error);
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card title="Write a newsletter" info="Uses the Base Camp newsletter design: big photo, your message, an optional offer code, up to four featured trips and a button. Every email has a one-click unsubscribe link. Send yourself a test first.">
        <div className="space-y-4">
          <div><Label htmlFor="cs" info="What people see in their inbox. Keep it under 60 characters.">Subject</Label><input id="cs" value={v.subject} onChange={(e) => set("subject", e.target.value)} className={inputClass} placeholder="Dashain offer: 10% off Everest treks" /></div>
          <div><Label htmlFor="cp" info="The grey line shown after the subject in most inboxes.">Preview line</Label><input id="cp" value={v.preheader} onChange={(e) => set("preheader", e.target.value)} className={inputClass} placeholder="Book by 15 October for autumn departures" /></div>
          <div>
            <Label info="A wide landscape photo works best. It's sent as a sharp JPEG that every email app shows.">Main photo</Label>
            {v.hero ? (
              <div className="relative overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/_next/image/?url=${encodeURIComponent(v.hero)}&w=828&q=70`} alt="" className="aspect-[15/8] w-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button type="button" onClick={() => setPicker(true)} className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink">Change</button>
                  <button type="button" onClick={() => set("hero", "")} className="rounded-lg bg-white/95 px-2 py-1.5 text-ink" aria-label="Remove photo"><X className="size-3.5" /></button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setPicker(true)} className="flex aspect-[15/8] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-sm font-semibold text-pine hover:border-pine"><ImagePlus className="size-6" /> Choose a photo</button>
            )}
          </div>
          <div><Label htmlFor="ch">Heading</Label><input id="ch" value={v.heading} onChange={(e) => set("heading", e.target.value)} className={inputClass} placeholder="Celebrate Dashain in the Himalayas" /></div>
          <div><Label htmlFor="cb" info={<>Blank line = new paragraph. Start lines with "- " for a list. **Bold** works.</>}>Message</Label><textarea id="cb" rows={7} value={v.body} onChange={(e) => set("body", e.target.value)} className={inputClass} placeholder={"Namaste!\n\nThis Dashain, enjoy **10% off** every Everest trek.\n\n- Valid for departures until 31 December\n- Book by 15 October"} /></div>
          <fieldset className="rounded-xl border border-line p-4">
            <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold">Coupon (optional)</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="oc" info="Choose one of your discount codes. It appears as a Base Camp coupon with its amount, end date and a Book with this code button.">Discount code</Label>
                <select id="oc" value={v.offerCode} onChange={(e) => set("offerCode", e.target.value)} className={inputClass}>
                  <option value="">No coupon</option>
                  {codes.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}
                </select>
              </div>
              <div><Label htmlFor="oh" info="Leave empty to use the code's own name.">Coupon title</Label><input id="oh" value={v.offerHeadline} onChange={(e) => set("offerHeadline", e.target.value)} className={inputClass} placeholder="Dashain festival offer" /></div>
            </div>
          </fieldset>
          <FieldView field={{ name: "trips", label: "Featured trips (up to 4)", type: "multiselect", ordered: true, help: "Shown as cards with photo, length and price, each linking to its page." }} value={v.trips} onChange={(x) => set("trips", (x as string[]).slice(0, 4))} ctx={{ options: { trips }, data: {}, siteUrl: "", urlPattern: null }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="cbt">Button</Label><input id="cbt" value={v.button} onChange={(e) => set("button", e.target.value)} className={inputClass} /></div>
            <div><Label htmlFor="cbu">Button link</Label><input id="cbu" value={v.buttonUrl} onChange={(e) => set("buttonUrl", e.target.value)} className={inputClass} /></div>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => send(true)} className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-pine disabled:opacity-50">Send me a test</button>
            <button type="button" disabled={pending} onClick={() => send(false)} className="flex-1 rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Sending…" : "Send to all subscribers"}</button>
          </div>
          {msg ? <p role="status" className="text-sm">{msg}</p> : null}
        </div>
      </Card>
      <Card title="Preview" info="How it looks in the inbox. Photos and links point to the live website.">
        <iframe title="Newsletter preview" srcDoc={html} sandbox="" className="h-[60rem] w-full rounded-xl border border-line bg-[#eef3f4]" />
      </Card>
      {picker ? <MediaPicker onClose={() => setPicker(false)} onPick={(items) => { set("hero", items[0].src); set("heroAlt", items[0].alt); setPicker(false); }} /> : null}
    </div>
  );
}
