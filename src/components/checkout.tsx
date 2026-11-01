"use client";

import Image from "@/components/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleCheckBig, Clock, Loader2, Lock, Minus, Plus, ShieldCheck, Tag, Users } from "lucide-react";
import { PaymentMarks } from "@/components/icons";
import { site } from "@/lib/site";
import type { Img, Price } from "@/lib/types";
import { cn, usd } from "@/lib/utils";

export type CheckoutTrip = { slug: string; title: string; days: number; price: Price; cover: Img | null; region: string };

const COUNTRIES = [
  "United States", "United Kingdom", "Australia", "Canada", "Germany", "France", "Netherlands", "Spain", "Italy", "Switzerland",
  "India", "China", "Japan", "South Korea", "Singapore", "Malaysia", "Thailand", "Israel", "New Zealand", "Ireland",
  "Belgium", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Poland", "Czechia", "Portugal", "Brazil",
  "Mexico", "Argentina", "South Africa", "United Arab Emirates", "Hong Kong", "Taiwan", "Philippines", "Indonesia", "Vietnam", "Other",
];

const DEPOSIT = 0.2;

function minDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function Checkout({ trips }: { trips: CheckoutTrip[] }) {
  const params = useSearchParams();
  const [slug, setSlug] = useState(params.get("trip") && trips.some((t) => t.slug === params.get("trip")) ? (params.get("trip") as string) : trips[0]?.slug);
  const [date, setDate] = useState(params.get("date") ?? "");
  const [pax, setPax] = useState(Math.min(30, Math.max(1, Number(params.get("pax")) || 1)));
  const [plan, setPlan] = useState<"deposit" | "full">("deposit");
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "", notes: "", terms: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ reference: string; paymentUrl: string | null; due: number } | null>(null);
  const [code, setCode] = useState(params.get("code") ?? "");
  const [promo, setPromo] = useState<{ code: string; label: string; kind: "percent" | "fixed"; value: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState("");

  const trip = trips.find((t) => t.slug === slug) ?? trips[0];
  const each = useMemo(() => {
    const tier = trip.price.groupTiers.find((t) => pax >= t.from && (!t.to || pax <= t.to));
    return tier?.price ?? trip.price.amount;
  }, [trip, pax]);
  const subtotal = each * pax;
  // The saving shown here is a preview; the server checks the code and prices the booking itself.
  const saving = promo ? Math.round((promo.kind === "percent" ? (subtotal * promo.value) / 100 : Math.min(promo.value, subtotal)) * 100) / 100 : 0;
  const total = Math.round((subtotal - saving) * 100) / 100;
  const due = plan === "deposit" ? Math.round(total * DEPOSIT * 100) / 100 : total;

  const applyCode = async () => {
    setPromoMsg("");
    if (!code.trim()) return;
    try {
      const res = await fetch(`/api/discount/?${new URLSearchParams({ code, trip: trip.slug, pax: String(pax) })}`);
      const json = await res.json();
      if (json.ok) {
        setPromo(json.discount);
        setPromoMsg(`${json.discount.label} applied.`);
      } else {
        setPromo(null);
        setPromoMsg(json.error ?? "That code isn't valid.");
      }
    } catch {
      setPromoMsg("Couldn't check the code. Please try again.");
    }
  };

  // Arriving from a voucher email (?code=…): check the code straight away.
  const fromLink = useRef(Boolean(params.get("code")));
  useEffect(() => {
    if (!fromLink.current) return;
    fromLink.current = false;
    void applyCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const endDate = date ? new Date(new Date(`${date}T00:00:00`).getTime() + (trip.days - 1) * 86400000) : null;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/booking/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: trip.slug, date, pax, plan, ...form, discountCode: promo?.code ?? "" }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Something went wrong");
      setDone({ reference: json.reference, paymentUrl: json.paymentUrl, due: json.due });
      if (json.paymentUrl) window.location.assign(json.paymentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again or WhatsApp us.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-card p-8 text-center sm:p-12">
        <span className="bg-moss/15 text-moss mx-auto grid size-16 place-items-center rounded-full">
          {done.paymentUrl ? <Loader2 className="size-8 animate-spin" aria-hidden /> : <CircleCheckBig className="size-8" aria-hidden />}
        </span>
        <h2 className="font-display mt-6 text-5xl font-black uppercase leading-[0.9]">
          {done.paymentUrl ? "Taking you to secure checkout" : "Your trip is reserved"}
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          {done.paymentUrl ? (
            <>Opening WeTravel to take your payment of {usd(done.due)}. If nothing happens, <a className="text-pine font-bold underline" href={done.paymentUrl}>continue to payment</a>.</>
          ) : (
            <>We&apos;ve received your booking for the {trip.title}. Shree&apos;s team will confirm the date and email you a secure WeTravel payment link for {usd(done.due)} within a few hours.</>
          )}
        </p>
        <p className="mt-6 inline-block rounded-full bg-snow-2 px-5 py-2 font-mono text-sm">Reference {done.reference}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/trip/${trip.slug}/`} className="rounded-full border border-line px-6 py-3 font-semibold">Back to the trip</Link>
          <a href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Namaste! My booking reference is ${done.reference}.`)}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white">
            WhatsApp us your reference
          </a>
        </div>
      </motion.div>
    );
  }

  const canNext = Boolean(date) && date >= minDate();
  const canPay = form.name.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim().length > 5 && form.country && form.terms;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_25rem]">
      <div>
        {/* Steps */}
        <ol className="mb-8 flex items-center gap-3 text-sm font-semibold" aria-label="Checkout steps">
          {[
            { n: 1, l: "Trip & dates" },
            { n: 2, l: "Traveller details" },
            { n: 3, l: "Payment" },
          ].map((s, i) => (
            <li key={s.n} className="flex items-center gap-3">
              {i > 0 ? <span className="h-px w-6 bg-line sm:w-12" aria-hidden /> : null}
              <span className={cn("grid size-8 place-items-center rounded-full font-mono text-xs", step >= s.n ? "bg-pine text-white" : "border border-line text-muted")}>
                {step > s.n ? <Check className="size-4" aria-hidden /> : s.n}
              </span>
              <span className={cn("hidden sm:inline", step >= s.n ? "text-ink" : "text-muted")}>{s.l}</span>
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6 rounded-[1.8rem] border border-line bg-card p-6 sm:p-8">
              <h2 className="font-display text-4xl font-black uppercase">Your trip</h2>
              <Field label="Trip" htmlFor="ck-trip">
                <select id="ck-trip" value={slug} onChange={(e) => setSlug(e.target.value)} className="input">
                  {trips.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.title} · {t.days} days · {usd(t.price.amount)}</option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Start date" htmlFor="ck-date" hint="At least two weeks away. For sooner, call us.">
                  <input id="ck-date" type="date" min={minDate()} value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
                </Field>
                <Field label="Travellers" htmlFor="ck-pax">
                  <div className="flex h-[3.25rem] items-center justify-between rounded-xl border border-line bg-snow px-2">
                    <button type="button" aria-label="One fewer traveller" onClick={() => setPax((p) => Math.max(1, p - 1))} className="grid size-10 place-items-center rounded-lg hover:bg-card"><Minus className="size-4" aria-hidden /></button>
                    <output id="ck-pax" className="font-display text-2xl font-black">{pax}</output>
                    <button type="button" aria-label="One more traveller" onClick={() => setPax((p) => Math.min(30, p + 1))} className="grid size-10 place-items-center rounded-lg hover:bg-card"><Plus className="size-4" aria-hidden /></button>
                  </div>
                </Field>
              </div>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">How would you like to pay?</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["deposit", "full"] as const).map((p) => (
                    <label key={p} className={cn("flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-colors", plan === p ? "border-pine bg-pine/5" : "border-line hover:border-pine/40")}>
                      <input type="radio" name="plan" value={p} checked={plan === p} onChange={() => setPlan(p)} className="accent-[var(--pine)] mt-1" />
                      <span>
                        <span className="block font-bold">{p === "deposit" ? `Deposit ${DEPOSIT * 100}% now` : "Pay in full"}</span>
                        <span className="block text-sm text-muted">{p === "deposit" ? `${usd(Math.round(total * DEPOSIT))} today, the rest before you fly` : `${usd(total)} today, nothing later`}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button type="button" disabled={!canNext} onClick={() => setStep(2)} className="bg-pine flex w-full items-center justify-center gap-2 rounded-full py-4 font-bold text-white transition-opacity disabled:opacity-40">
                Continue to traveller details <ArrowRight className="size-4" aria-hidden />
              </button>
              {!canNext ? <p className="text-center text-sm text-muted">Choose a start date to continue.</p> : null}
            </motion.div>
          ) : (
            <motion.form
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (canPay && !busy) submit();
              }}
              className="space-y-6 rounded-[1.8rem] border border-line bg-card p-6 sm:p-8"
            >
              <h2 className="font-display text-4xl font-black uppercase">Lead traveller</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Full name (as on passport)" htmlFor="ck-name">
                  <input id="ck-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
                </Field>
                <Field label="Email" htmlFor="ck-email">
                  <input id="ck-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" required />
                </Field>
                <Field label="Phone / WhatsApp" htmlFor="ck-phone">
                  <input id="ck-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+1 555 123 4567" required />
                </Field>
                <Field label="Nationality" htmlFor="ck-country">
                  <select id="ck-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" required>
                    <option value="">Choose…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Anything we should know? (optional)" htmlFor="ck-notes">
                <textarea id="ck-notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input h-auto py-3" placeholder="Dietary needs, flight times, a birthday on the trail…" />
              </Field>
              <Field label="Discount code (optional)" htmlFor="ck-code">
                <div className="flex gap-2">
                  <input id="ck-code" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); if (promo) setPromo(null); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyCode(); } }} className="input font-mono uppercase" placeholder="DASHAIN10" autoComplete="off" />
                  <button type="button" onClick={() => void applyCode()} className="shrink-0 rounded-full border border-line px-5 font-semibold hover:border-pine">Apply</button>
                </div>
                {promoMsg ? <p role="status" className={`mt-2 text-sm ${promo ? "text-moss font-semibold" : "text-crimson"}`}>{promoMsg}</p> : null}
              </Field>
              <label className="flex cursor-pointer gap-3 text-sm text-ink-soft">
                <input type="checkbox" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} className="accent-[var(--pine)] mt-0.5 size-4" />
                <span>
                  I have read and accept the <Link href="/terms-and-conditions/" target="_blank" className="text-pine font-semibold underline">booking terms</Link> and <Link href="/privacy-policy/" target="_blank" className="text-pine font-semibold underline">privacy policy</Link>.
                </span>
              </label>

              {error ? <p role="alert" className="rounded-xl bg-crimson/10 px-4 py-3 text-sm font-medium text-crimson">{error}</p> : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep(1)} className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-4 font-semibold">
                  <ArrowLeft className="size-4" aria-hidden /> Back
                </button>
                <button type="submit" disabled={!canPay || busy} className="bg-marigold text-pine-night flex flex-1 items-center justify-center gap-2 rounded-full py-4 font-bold transition-opacity disabled:opacity-40">
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                  Pay {usd(due)} securely
                </button>
              </div>
              <div className="flex flex-col items-center gap-3 border-t border-line pt-5 text-center text-xs text-muted">
                <PaymentMarks className="flex flex-wrap justify-center gap-2" />
                <p className="flex items-center gap-1.5"><ShieldCheck className="text-moss size-4" aria-hidden /> Card details are entered on WeTravel&apos;s secure checkout. We never see or store them.</p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="overflow-hidden rounded-[1.8rem] border border-line bg-card">
          <div className="relative aspect-[16/9] bg-pine-night">
            {trip.cover ? <Image src={trip.cover.src} alt={trip.cover.alt || trip.title} fill sizes="400px" className="object-cover object-right-bottom" /> : null}
            <div className="scrim-b absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="eyebrow text-white/70">{trip.region}</p>
              <p className="font-display text-3xl font-black uppercase leading-[0.95]">{trip.title}</p>
            </div>
          </div>
          <dl className="space-y-3 p-6 text-sm">
            <Row icon={<Clock className="size-4" aria-hidden />} label="Duration" value={`${trip.days} days`} />
            <Row icon={<CalendarDays className="size-4" aria-hidden />} label="Dates" value={date && endDate ? `${new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Choose a date"} />
            <Row icon={<Users className="size-4" aria-hidden />} label="Travellers" value={`${pax} × ${usd(each)}`} />
            {promo && saving ? <Row icon={<Tag className="size-4" aria-hidden />} label={`Discount ${promo.code}`} value={`−${usd(saving)}`} /> : null}
            <div className="flex items-baseline justify-between border-t border-dashed border-line pt-4">
              <dt className="font-semibold">Trip total</dt>
              <dd className="font-display text-3xl font-black">{usd(total)}</dd>
            </div>
            <div className="bg-marigold-soft flex items-baseline justify-between rounded-xl px-4 py-3">
              <dt className="font-semibold">Due today</dt>
              <dd className="font-display text-2xl font-black">{usd(due)}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          Questions? Call Shree 24/7 on <a href={`tel:${site.mobileHref}`} className="text-pine font-semibold">{site.mobile}</a>
        </p>
      </aside>
    </div>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-muted">{icon} {label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
