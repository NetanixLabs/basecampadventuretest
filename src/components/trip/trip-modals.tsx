"use client";

import { PayMethodChoice, usePayMethods, type PayMethod } from "@/components/pay-method";
import { tellTawk } from "@/lib/tawk";
import Image from "@/components/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleCheckBig, Loader2, Lock, Minus, Plus, Send, ShieldCheck, X } from "lucide-react";
import { PaymentMarks } from "@/components/icons";
import { Portal } from "@/components/portal";
import { COMMON_COUNTRIES, COUNTRIES } from "@/lib/countries";
import type { Img, Price } from "@/lib/types";
import { cn, usd } from "@/lib/utils";

/* ------------------------------------------------------------------ open/close from anywhere on the page */

type Modal = "book" | "enquire" | null;
let current: Modal = null;
const listeners = new Set<() => void>();
export function openTripModal(m: Modal) {
  current = m;
  listeners.forEach((l) => l());
}
const useModal = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );

export type ModalTrip = { slug: string; title: string; days: number; price: Price | null; cover: Img | null };

const DEPOSIT = 0.2;
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* ------------------------------------------------------------------ shell */

function Sheet({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div data-lenis-prevent className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-pine-night/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.8rem] border border-line bg-card shadow-[0_40px_100px_-30px_oklch(0.1_0.03_170/0.7)] sm:rounded-[1.8rem]",
          wide ? "sm:max-w-4xl" : "sm:max-w-xl",
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-snow-2 text-ink hover:bg-line sm:top-4 sm:right-4">
          <X className="size-5" aria-hidden />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ calendar */

function Calendar({ value, onChange, min }: { value: string; onChange: (v: string) => void; min: string }) {
  const minDate = new Date(`${min}T00:00:00`);
  const [view, setView] = useState(() => {
    const d = value ? new Date(`${value}T00:00:00`) : minDate;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // weeks start on Monday
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1))];
  }, [view]);
  const canPrev = view > new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  return (
    <div className="rounded-2xl border border-line bg-snow p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} aria-label="Previous month" className="grid size-9 place-items-center rounded-full hover:bg-card disabled:opacity-30">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <p className="font-bold">{view.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} aria-label="Next month" className="grid size-9 place-items-center rounded-full hover:bg-card">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.7rem] font-semibold tracking-wide text-muted uppercase">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const v = iso(d);
          const disabled = d < minDate;
          const on = v === value;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v)}
              aria-pressed={on}
              aria-label={d.toDateString()}
              className={cn(
                "aspect-square rounded-xl text-sm font-semibold transition-colors",
                on ? "bg-pine text-white" : disabled ? "text-muted/40" : "hover:bg-card hover:text-pine",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ booking */

function BookingFlow({ trip, onClose }: { trip: ModalTrip; onClose: () => void }) {
  const min = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return iso(d);
  }, []);
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [pax, setPax] = useState(Math.max(1, trip.price?.minPax ?? 1));
  const [plan, setPlan] = useState<"deposit" | "full">("deposit");
  const [f, setF] = useState({ name: "", email: "", phone: "", country: "", notes: "", terms: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ reference: string; paymentUrl: string | null; due: number } | null>(null);
  // Fixed group departures the office has put on the website, with seats left.
  const [deps, setDeps] = useState<{ date: string; seats: number | null; seatsLeft: number | null; guaranteed: boolean; full: boolean }[]>([]);
  useEffect(() => {
    let live = true;
    fetch(`/api/departures/?trip=${encodeURIComponent(trip.slug)}`).then((r) => (r.ok ? r.json() : { departures: [] })).then((j) => live && setDeps(j.departures ?? [])).catch(() => undefined);
    return () => { live = false; };
  }, [trip.slug]);
  const fixed = deps.find((d) => d.date === date);
  const tooMany = Boolean(fixed && fixed.seatsLeft !== null && pax > fixed.seatsLeft);

  const price = trip.price!;
  const each = (price.groupTiers.find((t) => pax >= t.from && (!t.to || pax <= t.to))?.price ?? price.amount);
  const total = each * pax;
  const due = plan === "deposit" ? Math.round(total * DEPOSIT * 100) / 100 : total;
  const end = date ? new Date(new Date(`${date}T00:00:00`).getTime() + (trip.days - 1) * 86400000) : null;
  const { methods: payMethods, preferred } = usePayMethods();
  const [methodChoice, setMethod] = useState<PayMethod | null>(null);
  const method: PayMethod = methodChoice ?? preferred;
  const okDetails = f.name.trim().length > 1 && /\S+@\S+\.\S+/.test(f.email) && f.phone.trim().length > 5 && f.country;

  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/booking/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip: trip.slug, date, pax, plan, ...f, method }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Something went wrong");
      setDone({ reference: json.reference, paymentUrl: json.paymentUrl, due: json.due });
      tellTawk("booking", { name: f.name, email: f.email, phone: f.phone, reference: json.reference, trip: trip.title });
      if (json.paymentUrl) window.location.assign(json.paymentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const steps = ["Date & travellers", "Your details", "Review & pay"];

  if (done) {
    return (
      <div className="flex flex-col items-center overflow-y-auto px-6 pt-10 pb-8 text-center sm:px-10">
        <span className="bg-moss/15 text-moss grid size-16 place-items-center rounded-full">
          {done.paymentUrl ? <Loader2 className="size-8 animate-spin" aria-hidden /> : <CircleCheckBig className="size-8" aria-hidden />}
        </span>
        <h2 className="font-display mt-5 text-4xl font-black uppercase leading-[0.92]">{done.paymentUrl ? "Opening secure payment" : "Booking received"}</h2>
        <p className="mt-3 max-w-md text-ink-soft">
          {done.paymentUrl ? (
            <>Taking you to WeTravel to pay {usd(done.due)}. If nothing happens, <a className="text-pine font-bold underline" href={done.paymentUrl}>continue to payment</a>.</>
          ) : (
            <>Thank you. Our team will confirm your {trip.title} and send a secure WeTravel payment link for {usd(done.due)} to {f.email}.</>
          )}
        </p>
        <p className="mt-5 rounded-full bg-snow-2 px-5 py-2 font-mono text-sm">Reference {done.reference}</p>
        <button type="button" onClick={onClose} className="bg-ink text-snow mt-7 rounded-full px-7 py-3 font-bold">Close</button>
      </div>
    );
  }

  return (
    <>
      {/* Trip strip */}
      <div className="flex items-center gap-4 border-b border-line px-5 pt-4 pb-4 pr-16 sm:px-7 sm:pt-6">
        {trip.cover ? (
          <span className="relative size-14 shrink-0 overflow-hidden rounded-xl">
            <Image src={trip.cover.src} alt="" fill sizes="56px" className="object-cover" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="eyebrow text-pine">Book Now</p>
          <p className="truncate font-bold">{trip.title}</p>
          <p className="text-sm text-muted">{trip.days} days · {usd(price.amount)} / Adult</p>
        </div>
      </div>

      <ol className="flex items-center gap-2 px-5 pt-4 text-xs font-semibold sm:px-7" aria-label="Booking steps">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full font-mono text-[0.68rem]", i <= step ? "bg-pine text-white" : "bg-snow-2 text-muted")}>
              {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("hidden truncate sm:inline", i <= step ? "text-ink" : "text-muted")}>{s}</span>
            {i < steps.length - 1 ? <span className={cn("h-px flex-1", i < step ? "bg-pine" : "bg-line")} aria-hidden /> : null}
          </li>
        ))}
      </ol>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
            {step === 0 ? (
              <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
                <div>
                  {deps.length ? (
                    <div className="mb-5">
                      <p className="mb-2 text-sm font-semibold">Join a group departure</p>
                      <ul className="grid gap-2">
                        {deps.slice(0, 6).map((d) => {
                          const start = new Date(`${d.date}T00:00:00`);
                          const endD = new Date(start.getTime() + (trip.days - 1) * 86400000);
                          const on = date === d.date;
                          return (
                            <li key={d.date}>
                              <button type="button" disabled={d.full} onClick={() => setDate(d.date)} aria-pressed={on} className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? "border-pine bg-pine/5" : "border-line bg-snow hover:border-pine/50"}`}>
                                <span className="font-semibold">{start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {endD.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 text-xs font-semibold">
                                  {d.guaranteed ? <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">Guaranteed</span> : null}
                                  {d.full ? <span className="rounded-full bg-crimson/10 px-2 py-0.5 text-crimson">Full</span> : d.seatsLeft !== null ? <span className={`rounded-full px-2 py-0.5 ${d.seatsLeft <= 3 ? "bg-crimson/10 text-crimson" : "bg-pine/10 text-pine"}`}>{d.seatsLeft} {d.seatsLeft === 1 ? "seat" : "seats"} left</span> : null}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-3 text-xs text-muted">Or choose any date below for a private trip.</p>
                    </div>
                  ) : null}
                  <p className="mb-2 text-sm font-semibold">Choose your start date</p>
                  <Calendar value={date} onChange={setDate} min={min} />
                  {tooMany ? <p role="alert" className="mt-3 rounded-xl bg-crimson/10 px-3 py-2 text-sm text-crimson">Only {fixed!.seatsLeft} {fixed!.seatsLeft === 1 ? "seat is" : "seats are"} left on this departure. Choose fewer travellers or another date.</p> : null}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-semibold">Travellers</p>
                    <div className="flex items-center justify-between rounded-2xl border border-line bg-snow p-2">
                      <span className="px-2 text-sm">
                        Adult <span className="text-muted">· {usd(each)}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="One fewer traveller" disabled={pax <= 1} onClick={() => setPax((p) => Math.max(1, p - 1))} className="grid size-10 place-items-center rounded-xl hover:bg-card disabled:opacity-30">
                          <Minus className="size-4" aria-hidden />
                        </button>
                        <span className="font-display w-8 text-center text-2xl font-black" aria-live="polite">{pax}</span>
                        <button type="button" aria-label="One more traveller" onClick={() => setPax((p) => Math.min(30, p + 1))} className="grid size-10 place-items-center rounded-xl hover:bg-card">
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-snow-2 p-4 text-sm">
                    <div className="flex justify-between"><span className="text-muted">Start</span><span className="font-semibold">{date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Pick a date"}</span></div>
                    {end ? <div className="mt-1 flex justify-between"><span className="text-muted">End</span><span className="font-semibold">{end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div> : null}
                    <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3"><span className="font-semibold">Total</span><span className="font-display text-3xl font-black">{usd(total)}</span></div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name *" id="bm-name"><input id="bm-name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" /></Field>
                <Field label="Email *" id="bm-email"><input id="bm-email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="input" /></Field>
                <Field label="Phone *" id="bm-phone"><input id="bm-phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="input" /></Field>
                <Field label="Country *" id="bm-country"><CountrySelect id="bm-country" value={f.country} onChange={(v) => setF({ ...f, country: v })} /></Field>
                <Field label="Your message" id="bm-notes" wide>
                  <textarea id="bm-notes" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="input py-3" />
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["deposit", "full"] as const).map((p) => (
                    <label key={p} className={cn("flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-colors", plan === p ? "border-pine bg-pine/5" : "border-line hover:border-pine/40")}>
                      <input type="radio" name="bm-plan" checked={plan === p} onChange={() => setPlan(p)} className="mt-1 accent-[var(--pine)]" />
                      <span>
                        <span className="block font-bold">{p === "deposit" ? `Pay ${DEPOSIT * 100}% deposit` : "Pay in full"}</span>
                        <span className="block text-sm text-muted">{p === "deposit" ? `${usd(Math.round(total * DEPOSIT))} now` : `${usd(total)} now`}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <dl className="space-y-2 rounded-2xl bg-snow-2 p-4 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">Trip</dt><dd className="text-right font-semibold">{trip.title}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Dates</dt><dd className="font-semibold">{date && end ? `${new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Travellers</dt><dd className="font-semibold">{pax} × {usd(each)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Lead traveller</dt><dd className="font-semibold">{f.name}</dd></div>
                  <div className="flex items-baseline justify-between border-t border-line pt-2"><dt className="font-semibold">Due now</dt><dd className="font-display text-3xl font-black">{usd(due)}</dd></div>
                </dl>
                <PayMethodChoice value={method} onChange={setMethod} methods={payMethods} />
                <label className="flex cursor-pointer gap-3 text-sm text-ink-soft">
                  <input type="checkbox" checked={f.terms} onChange={(e) => setF({ ...f, terms: e.target.checked })} className="mt-0.5 size-4 accent-[var(--pine)]" />
                  <span>
                    I agree to the <Link href="/terms-and-conditions/" target="_blank" className="text-pine font-semibold underline">Terms &amp; Conditions</Link> and <Link href="/privacy-policy/" target="_blank" className="text-pine font-semibold underline">Privacy Policy</Link>.
                  </span>
                </label>
                {error ? <p role="alert" className="rounded-xl bg-crimson/10 px-4 py-3 text-sm font-medium text-crimson">{error}</p> : null}
                <div className="flex flex-col items-center gap-2 pt-1 text-center text-xs text-muted">
                  <PaymentMarks className="flex flex-wrap justify-center gap-1.5" />
                  <p className="flex items-center gap-1.5"><ShieldCheck className="text-moss size-4" aria-hidden /> Card payment on WeTravel&apos;s secure checkout.</p>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 border-t border-line bg-snow px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-4">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-3 text-sm font-semibold">
            <ArrowLeft className="size-4" aria-hidden /> Back
          </button>
        ) : (
          <div className="min-w-0">
            <p className="text-xs text-muted">Total</p>
            <p className="font-display text-2xl font-black leading-none">{usd(total)}</p>
          </div>
        )}
        <div className="ml-auto">
          {step < 2 ? (
            <button
              type="button"
              disabled={step === 0 ? !date || tooMany : !okDetails}
              onClick={() => setStep(step + 1)}
              className="bg-pine inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-35"
            >
              {step === 0 ? (date ? "Continue" : "Pick a date") : "Continue"} <ArrowRight className="size-4" aria-hidden />
            </button>
          ) : (
            <button type="button" disabled={!f.terms || busy} onClick={pay} className="bg-marigold text-pine-night inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-opacity disabled:opacity-40">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />} Pay {usd(due)}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ enquiry (the live site's "Send Us A Message") */

function EnquiryFlow({ trip, onClose }: { trip: ModalTrip; onClose: () => void }) {
  const [f, setF] = useState({ name: "", email: "", country: "", phone: "", message: "", agree: false, website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/enquiry/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "contact", trip: trip.title, name: f.name, email: f.email, country: f.country, phone: f.phone, message: f.message, website: f.website }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Something went wrong");
      tellTawk("enquiry", { name: f.name, email: f.email, phone: f.phone, reference: json.reference, trip: trip.title });
      setRef(json.reference);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (ref) {
    return (
      <div className="flex flex-col items-center px-6 pt-10 pb-8 text-center">
        <span className="bg-moss/15 text-moss grid size-16 place-items-center rounded-full"><CircleCheckBig className="size-8" aria-hidden /></span>
        <h2 className="font-display mt-5 text-4xl font-black uppercase">Message sent</h2>
        <p className="mt-3 max-w-sm text-ink-soft">Our team will respond to your inquiry as soon as possible.</p>
        <p className="mt-5 rounded-full bg-snow-2 px-5 py-2 font-mono text-sm">Reference {ref}</p>
        <button type="button" onClick={onClose} className="bg-ink text-snow mt-7 rounded-full px-7 py-3 font-bold">Close</button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-5 pt-4 pb-4 pr-16 sm:px-7 sm:pt-6">
        <p className="eyebrow text-pine">Send Us A Message</p>
        <p className="mt-1 text-sm text-ink-soft">Please fill out and submit the inquiry form below. Our team will respond to your inquiry as soon as possible.</p>
      </div>
      <div className="grid flex-1 gap-4 overflow-y-auto overscroll-contain px-5 py-5 sm:grid-cols-2 sm:px-7">
        <Field label="Trip name" id="em-trip" wide><input id="em-trip" value={trip.title} readOnly className="input opacity-80" /></Field>
        <Field label="Your name *" id="em-name"><input id="em-name" required autoComplete="name" placeholder="Enter Your Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" /></Field>
        <Field label="Your email *" id="em-email"><input id="em-email" required type="email" autoComplete="email" placeholder="Enter Your Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="input" /></Field>
        <Field label="Country *" id="em-country"><CountrySelect id="em-country" value={f.country} onChange={(v) => setF({ ...f, country: v })} required /></Field>
        <Field label="Contact number *" id="em-phone"><input id="em-phone" required type="tel" autoComplete="tel" placeholder="Enter Your Contact Number" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="input" /></Field>
        <Field label="Your message *" id="em-msg" wide><textarea id="em-msg" required rows={4} placeholder="Enter Your message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="input py-3" /></Field>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} className="hidden" aria-hidden />
        <label className="flex cursor-pointer gap-3 text-sm text-ink-soft sm:col-span-2">
          <input type="checkbox" required checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} className="mt-0.5 size-4 accent-[var(--pine)]" />
          <span>I agree with the <Link href="/privacy-policy/" target="_blank" className="text-pine font-semibold underline">Privacy Policy</Link>.</span>
        </label>
        {error ? <p role="alert" className="rounded-xl bg-crimson/10 px-4 py-3 text-sm font-medium text-crimson sm:col-span-2">{error}</p> : null}
      </div>
      <div className="flex justify-end border-t border-line bg-snow px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-4">
        <button type="submit" disabled={busy} className="bg-pine inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Send Email
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ shared bits */

function Field({ label, id, wide, children }: { label: string; id: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

export function CountrySelect({ id, value, onChange, required }: { id: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <select id={id} value={value} required={required} onChange={(e) => onChange(e.target.value)} className="input">
      <option value="">Choose any country</option>
      <optgroup label="Common">
        {COMMON_COUNTRIES.map((c) => (
          <option key={`c-${c}`} value={c}>{c}</option>
        ))}
      </optgroup>
      <optgroup label="All countries">
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </optgroup>
    </select>
  );
}

/** Mounted once on the trip page; opened by the booking card and the mobile bar. */
export function TripModals({ trip }: { trip: ModalTrip }) {
  const modal = useModal();
  const close = () => openTripModal(null);
  // Links from the translated pages arrive as /trip/<slug>/#book and open the booking form.
  useEffect(() => {
    if (window.location.hash === "#book") {
      openTripModal(trip.price ? "book" : "enquire");
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [trip.price]);
  return (
    <Portal>
      <AnimatePresence>
        {modal === "book" && trip.price ? (
          <Sheet key="book" title={`Book ${trip.title}`} onClose={close} wide>
            <BookingFlow trip={trip} onClose={close} />
          </Sheet>
        ) : null}
        {modal === "enquire" ? (
          <Sheet key="enquire" title="Send Us A Message" onClose={close}>
            <EnquiryFlow trip={trip} onClose={close} />
          </Sheet>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}

