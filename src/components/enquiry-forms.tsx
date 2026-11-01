"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CircleCheckBig, Loader2, Send } from "lucide-react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

async function send(payload: Record<string, unknown>) {
  const res = await fetch("/api/enquiry/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({ ok: false }));
  if (!json.ok) throw new Error(json.error ?? "Something went wrong. Please try again or WhatsApp us.");
  return json.reference as string;
}

function Sent({ reference, onReset }: { reference: string; onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-10 text-center">
      <span className="bg-moss/15 text-moss grid size-16 place-items-center rounded-full">
        <CircleCheckBig className="size-8" aria-hidden />
      </span>
      <h3 className="font-display mt-6 text-5xl font-black uppercase leading-[0.9]">
        Namaste, <span className="accent-word text-marigold">message received.</span>
      </h3>
      <p className="mt-4 max-w-md text-ink-soft">Our Kathmandu team will reply within a few hours, usually much sooner. For anything urgent, WhatsApp {site.contactPerson.split(" ")[0]} on {site.mobile}.</p>
      <p className="mt-5 rounded-full bg-snow-2 px-5 py-2 font-mono text-sm">Reference {reference}</p>
      <button type="button" onClick={onReset} className="text-pine mt-6 font-semibold underline">Send another message</button>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- contact */

export function ContactForm({ trips }: { trips: string[] }) {
  const params = useSearchParams();
  const initialTrip = params.get("trip") ?? "";
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    trip: initialTrip,
    date: params.get("date") ?? "",
    travellers: params.get("pax") ?? "",
    message: "",
    website: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  if (ref) return <Sent reference={ref} onReset={() => setRef("")} />;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          setRef(await send({ kind: "contact", ...f }));
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className="grid gap-5 sm:grid-cols-2"
    >
      <F label="Your name" id="c-name"><input id="c-name" autoComplete="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" /></F>
      <F label="Email address" id="c-email"><input id="c-email" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="input" /></F>
      <F label="Phone / WhatsApp (optional)" id="c-phone"><input id="c-phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="input" /></F>
      <F label="Country (optional)" id="c-country"><input id="c-country" autoComplete="country-name" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} className="input" /></F>
      <F label="Where would you like to go?" id="c-trip" wide>
        <input id="c-trip" list="c-trips" value={f.trip} onChange={(e) => setF({ ...f, trip: e.target.value })} className="input" placeholder="I'm open to ideas" />
        <datalist id="c-trips">
          {trips.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </F>
      <F label="When are you thinking?" id="c-date"><input id="c-date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="input" placeholder="e.g. October 2027" /></F>
      <F label="Travellers" id="c-pax">
        <select id="c-pax" value={f.travellers} onChange={(e) => setF({ ...f, travellers: e.target.value })} className="input">
          <option value="">Choose…</option>
          {["1 person", "2 people", "3–5 people", "6–10 people", "More than 10 people"].map((o) => (
            <option key={o}>{o}</option>
          ))}
          {f.travellers && !Number.isNaN(Number(f.travellers)) ? <option value={f.travellers}>{f.travellers} people</option> : null}
        </select>
      </F>
      <F label="Anything else?" id="c-msg" wide>
        <textarea id="c-msg" rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="input py-3" placeholder="Your fitness, past treks, must-sees, questions…" />
      </F>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} className="hidden" aria-hidden />
      {error ? <p role="alert" className="rounded-xl bg-crimson/10 px-4 py-3 text-sm font-medium text-crimson sm:col-span-2">{error}</p> : null}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Your details are used only to help plan your trip.</p>
        <button type="submit" disabled={busy} className="bg-pine inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-bold text-white transition-colors hover:bg-pine-deep disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Send my enquiry
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- custom trip */

const INTERESTS = ["Classic trekking", "High passes", "Peak climbing", "Culture & temples", "Wildlife safari", "Helicopter flights", "River rafting", "Luxury lodges", "Family friendly", "Photography", "Monasteries", "Off the beaten path"];
const PLACES = ["Everest", "Annapurna", "Langtang", "Manaslu", "Mustang", "Kathmandu Valley", "Chitwan", "Pokhara", "Bhutan", "Tibet", "Not sure yet"];

export function CustomTripForm() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    places: [] as string[],
    interests: [] as string[],
    date: "",
    duration: "",
    travellers: "",
    fitness: "",
    budget: "",
    name: "",
    email: "",
    phone: "",
    country: "",
    message: "",
    website: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  const toggle = (key: "places" | "interests", v: string) =>
    setF((s) => ({ ...s, [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] }));

  if (ref) return <Sent reference={ref} onReset={() => { setRef(""); setStep(0); }} />;

  const steps = ["Where & what", "When & who", "Your details"];

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between text-sm font-semibold">
          {steps.map((s, i) => (
            <span key={s} className={cn(i <= step ? "text-pine" : "text-muted")}>{s}</span>
          ))}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <motion.div className="bg-marigold h-full rounded-full" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
          {step === 0 ? (
            <div className="space-y-8">
              <ChipGroup label="Where would you like to go?" options={PLACES} selected={f.places} onToggle={(v) => toggle("places", v)} />
              <ChipGroup label="What should the trip include?" options={INTERESTS} selected={f.interests} onToggle={(v) => toggle("interests", v)} />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <F label="Roughly when?" id="t-date"><input id="t-date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="input" placeholder="e.g. late March 2027" /></F>
              <F label="Time available" id="t-dur">
                <select id="t-dur" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} className="input">
                  <option value="">Choose…</option>
                  {["Up to a week", "1–2 weeks", "2–3 weeks", "More than 3 weeks", "Flexible"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </F>
              <F label="Travellers" id="t-pax">
                <select id="t-pax" value={f.travellers} onChange={(e) => setF({ ...f, travellers: e.target.value })} className="input">
                  <option value="">Choose…</option>
                  {["Just me", "2 people", "3–5 people", "6–10 people", "More than 10"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </F>
              <F label="Budget per person" id="t-budget">
                <select id="t-budget" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} className="input">
                  <option value="">Choose…</option>
                  {["Under US$1,000", "US$1,000–2,000", "US$2,000–3,500", "Over US$3,500", "Not sure"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </F>
              <fieldset className="sm:col-span-2">
                <legend className="mb-3 text-sm font-semibold">Fitness and experience</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { v: "Easy", d: "Walks of 3–5 hours, no high altitude" },
                    { v: "Moderate", d: "Regular hiker, happy with 6 hours a day" },
                    { v: "Strenuous", d: "Fit, has trekked at altitude before" },
                  ].map((o) => (
                    <label key={o.v} className={cn("cursor-pointer rounded-2xl border-2 p-4 transition-colors", f.fitness === o.v ? "border-pine bg-pine/5" : "border-line hover:border-pine/40")}>
                      <input type="radio" name="fitness" className="sr-only" checked={f.fitness === o.v} onChange={() => setF({ ...f, fitness: o.v })} />
                      <span className="block font-bold">{o.v}</span>
                      <span className="mt-1 block text-sm text-muted">{o.d}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 2 ? (
            <form
              id="custom-trip"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  setRef(
                    await send({
                      kind: "custom-trip",
                      ...f,
                      trip: f.places.join(", "),
                      interests: f.interests,
                    }),
                  );
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="grid gap-5 sm:grid-cols-2"
            >
              <F label="Your name" id="t-name"><input id="t-name" autoComplete="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" /></F>
              <F label="Email address" id="t-email"><input id="t-email" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="input" /></F>
              <F label="Phone / WhatsApp (optional)" id="t-phone"><input id="t-phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="input" /></F>
              <F label="Country (optional)" id="t-country"><input id="t-country" autoComplete="country-name" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} className="input" /></F>
              <F label="Tell us about your dream trip" id="t-msg" wide>
                <textarea id="t-msg" rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="input py-3" />
              </F>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} className="hidden" aria-hidden />
              {error ? <p role="alert" className="rounded-xl bg-crimson/10 px-4 py-3 text-sm font-medium text-crimson sm:col-span-2">{error}</p> : null}
            </form>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-4 font-semibold">
            <ArrowLeft className="size-4" aria-hidden /> Back
          </button>
        ) : (
          <Link href="/trip/" className="inline-flex items-center justify-center rounded-full px-6 py-4 font-semibold text-muted hover:text-ink">
            Browse ready-made trips instead
          </Link>
        )}
        {step < 2 ? (
          <button type="button" onClick={() => setStep(step + 1)} className="bg-pine inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-bold text-white">
            Continue <ArrowRight className="size-4" aria-hidden />
          </button>
        ) : (
          <button type="submit" form="custom-trip" disabled={busy} className="bg-marigold text-pine-night inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-bold disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Send my trip idea
          </button>
        )}
      </div>
    </div>
  );
}

function ChipGroup({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="font-display mb-4 text-3xl font-black uppercase">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button key={o} type="button" onClick={() => onToggle(o)} aria-pressed={on} className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-all", on ? "bg-pine scale-[1.03] text-white" : "border border-line bg-card hover:border-pine")}>
              {on ? <Check className="size-4" aria-hidden /> : null}
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function F({ label, id, wide, children }: { label: string; id: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}
