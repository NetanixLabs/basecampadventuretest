"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, Label, inputClass } from "@/components/admin/ui";
import { addFixedDeparture, saveDepartureSettings } from "./actions";

const check = "flex items-center gap-2 text-sm font-semibold";

/** Put a new group departure on the website. */
export function AddFixedDeparture({ trips }: { trips: { slug: string; title: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState({ trip: "", date: "", seats: "12", guaranteed: false });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title="Add a fixed departure" info="A group date shown on the trip's booking form, with the seats left (counted from the bookings) and an optional Guaranteed label. Leave Seats empty for no limit. Travellers can still choose their own date for a private trip.">
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_10rem_7rem_auto_auto] lg:items-end" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addFixedDeparture({ trip: v.trip, date: v.date, seats: v.seats ? Number(v.seats) : null, guaranteed: v.guaranteed }); setMsg({ ok: r.ok, text: r.message }); if (r.ok) { setV({ ...v, date: "" }); router.refresh(); } }); }}>
        <div><Label htmlFor="fd-trip">Trip</Label><select id="fd-trip" required value={v.trip} onChange={(e) => setV({ ...v, trip: e.target.value })} className={inputClass}><option value="">Choose a trip…</option>{trips.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}</select></div>
        <div><Label htmlFor="fd-date">Start date</Label><input id="fd-date" type="date" required value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} className={inputClass} /></div>
        <div><Label htmlFor="fd-seats">Seats</Label><input id="fd-seats" inputMode="numeric" value={v.seats} onChange={(e) => setV({ ...v, seats: e.target.value.replace(/\D/g, "") })} className={inputClass} placeholder="No limit" /></div>
        <label className={`${check} pb-2.5`}><input type="checkbox" checked={v.guaranteed} onChange={(e) => setV({ ...v, guaranteed: e.target.checked })} className="size-4 accent-[var(--pine)]" /> Guaranteed</label>
        <button disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Adding…" : "Add"}</button>
      </form>
      {msg ? <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-pine" : "text-red-700"}`}>{msg.text}</p> : null}
    </Card>
  );
}

/** Website and pickup settings for one departure. */
export function DepartureSettings({ depKey, value, booked }: { depKey: string; value: { published: boolean; seats: number | null; guaranteed: boolean; pickupTime: string; pickupPlace: string }; booked: number }) {
  const router = useRouter();
  const [v, setV] = useState({ ...value, seats: value.seats == null ? "" : String(value.seats) });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const left = v.seats ? Math.max(0, Number(v.seats) - booked) : null;
  return (
    <Card title="Booking & pickup" info="Show on website: the date appears on the trip's booking form as a group departure. Seats: the total; seats left = seats minus travellers booked. Pickup time and place go into the day-before email to every traveller, with their guide's name.">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveDepartureSettings(depKey, { published: v.published, seats: v.seats ? Number(v.seats) : null, guaranteed: v.guaranteed, pickupTime: v.pickupTime, pickupPlace: v.pickupPlace }); setMsg(r.message); router.refresh(); }); }}>
        <label className={check}><input type="checkbox" checked={v.published} onChange={(e) => setV({ ...v, published: e.target.checked })} className="size-4 accent-[var(--pine)]" /> Show on the website as a group departure</label>
        <label className={check}><input type="checkbox" checked={v.guaranteed} onChange={(e) => setV({ ...v, guaranteed: e.target.checked })} className="size-4 accent-[var(--pine)]" /> Guaranteed departure</label>
        <div><Label htmlFor="ds-seats" hint={left !== null ? <span className="text-xs text-muted">{booked} booked · {left} left</span> : undefined}>Seats</Label><input id="ds-seats" inputMode="numeric" value={v.seats} onChange={(e) => setV({ ...v, seats: e.target.value.replace(/\D/g, "") })} className={inputClass} placeholder="No limit" /></div>
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
          <div><Label htmlFor="ds-pt">Pickup time</Label><input id="ds-pt" value={v.pickupTime} onChange={(e) => setV({ ...v, pickupTime: e.target.value })} className={inputClass} placeholder="6:30 am" /></div>
          <div><Label htmlFor="ds-pp">Pickup place</Label><input id="ds-pp" value={v.pickupPlace} onChange={(e) => setV({ ...v, pickupPlace: e.target.value })} className={inputClass} placeholder="Your hotel lobby in Thamel" /></div>
        </div>
        <div className="flex items-center gap-3"><button disabled={pending} className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>{msg ? <span role="status" className="text-sm text-pine">{msg}</span> : null}</div>
      </form>
    </Card>
  );
}
