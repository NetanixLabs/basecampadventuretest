"use client";

import { useEffect, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { previewCoupon, sendCoupon } from "./coupon-actions";

const PHOTOS = [
  ["/photos/hero-ama-dablam.webp", "Ama Dablam"],
  ["/photos/hero-gokyo.webp", "Gokyo"],
  ["/photos/hero-machapuchare.webp", "Machapuchare"],
  ["/photos/hero-alpenglow.webp", "Alpenglow"],
  ["/photos/hero-mustang.webp", "Mustang"],
] as const;

export function CouponSender({ codes }: { codes: { code: string; label: string }[] }) {
  const [v, setV] = useState({ code: codes[0]?.code ?? "", name: "", email: "", message: "", photo: PHOTOS[0][0] as string });
  const [html, setHtml] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v, x: string) => setV((o) => ({ ...o, [k]: x }));
  useEffect(() => {
    if (!v.code) return;
    const t = setTimeout(() => void previewCoupon(v).then(setHtml), 350);
    return () => clearTimeout(t);
  }, [v]);
  if (!codes.length) return null;
  const image = `/coupon/${encodeURIComponent(v.code)}/?photo=${encodeURIComponent(v.photo)}`;
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <Card title="Send a voucher" info="Emails a designed Base Camp gift voucher with the code to one traveller: perfect for returning guests, referrals or a thank-you after a trip. You can also download the voucher image to share on WhatsApp or print.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="vc">Code</Label><select id="vc" value={v.code} onChange={(e) => set("code", e.target.value)} className={inputClass}>{codes.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}</select></div>
            <div><Label htmlFor="vp" info="The mountain view behind the voucher.">Photo</Label><select id="vp" value={v.photo} onChange={(e) => set("photo", e.target.value)} className={inputClass}>{PHOTOS.map(([p, l]) => <option key={p} value={p}>{l}</option>)}</select></div>
            <div><Label htmlFor="vn">Traveller's first name</Label><input id="vn" value={v.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="Emma" /></div>
            <div><Label htmlFor="ve">Email</Label><input id="ve" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} className={inputClass} placeholder="emma@example.com" /></div>
          </div>
          <div><Label htmlFor="vm" info="Leave empty for a friendly standard message.">Personal message</Label><textarea id="vm" rows={4} value={v.message} onChange={(e) => set("message", e.target.value)} className={inputClass} placeholder="Thank you for trekking with us to Everest Base Camp! Here's 10% off your next adventure with us." /></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await sendCoupon(v, true)).message))} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-pine disabled:opacity-50">Send me a test</button>
            <button type="button" disabled={pending || !v.email} onClick={() => start(async () => { if (!confirm(`Send the ${v.code} voucher to ${v.email}?`)) return; setMsg((await sendCoupon(v, false)).message); })} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Sending…" : "Send voucher"}</button>
            <a href={image} download={`base-camp-voucher-${v.code}.jpg`} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-pine hover:bg-pine/8"><Download className="size-4" /> Download image</a>
          </div>
          {msg ? <p role="status" className="text-sm">{msg}</p> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`Voucher ${v.code}`} className="w-full rounded-2xl border border-line" />
        </div>
      </Card>
      <Card title="Email preview" info="Exactly what the traveller receives.">
        <iframe title="Voucher email preview" srcDoc={html} sandbox="" className="h-[52rem] w-full rounded-xl border border-line bg-[#eef3f4]" />
      </Card>
    </div>
  );
}
