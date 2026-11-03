"use client";

import { tellTawk } from "@/lib/tawk";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleCheckBig, Loader2, Mail, MessageCircle, Minus, Mountain, Pencil, Phone, Plus, Send, Users } from "lucide-react";
import { WhatsappIcon } from "@/components/icons";
import { CountrySelect } from "@/components/trip/trip-modals";
import { site, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";

export type RequestTrip = { slug: string; title: string; days: number; price: number | null };

const PLACES = ["Everest", "Annapurna", "Langtang", "Manaslu", "Mustang & remote areas", "Kathmandu & culture", "Chitwan & wildlife", "Bhutan", "Tibet"];
const INTERESTS = ["Trekking", "Peak climbing", "Culture & heritage", "Wildlife & safari", "Helicopter tour", "Rafting", "Photography", "Family trip"];
const STYLES = [
  { v: "Standard", d: "Local teahouses and lodges on the trail" },
  { v: "Comfort", d: "The best lodges available, more rest days" },
  { v: "Luxury", d: "Luxury lodges, private transfers, helicopter options" },
];
const STEPS = ["Your trip", "When & who", "About you", "Review"];

type Form = {
  trip: string;
  places: string[];
  interests: string[];
  date: string;
  flexible: boolean;
  duration: string;
  adults: number;
  children: number;
  style: string;
  budget: string;
  fitness: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  contactBy: string;
  message: string;
  consent: boolean;
  website: string;
};

/**
 * "Start your trip request": four short steps with a live summary beside
 * them. Opened from a trip page (?trip=slug) it starts from that trip.
 */
export function TripRequest({ trips }: { trips: RequestTrip[] }) {
  const params = useSearchParams();
  // Arriving from a trip page (?trip=slug): start from that trip.
  const fromTrip = params.get("trip") ?? "";
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(() => ({
    trip: trips.some((t) => t.slug === fromTrip) ? fromTrip : "",
    places: [],
    interests: [],
    date: "",
    flexible: false,
    duration: "",
    adults: 2,
    children: 0,
    style: "",
    budget: "",
    fitness: "",
    name: "",
    email: "",
    phone: "",
    country: "",
    contactBy: "Email",
    message: "",
    consent: false,
    website: "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  const chosen = useMemo(() => trips.find((t) => t.slug === f.trip) ?? null, [trips, f.trip]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const toggle = (k: "places" | "interests", v: string) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));

  const stepError = (n: number) => {
    if (n === 0 && !f.trip && !f.places.length && !f.interests.length) return "Choose a trip, or tell us where you'd like to go.";
    if (n === 1 && !f.date && !f.flexible) return "Add a start date, or tick that your dates are flexible.";
    if (n === 2 && f.name.trim().length < 2) return "Please tell us your name.";
    if (n === 2 && !/^\S+@\S+\.\S+$/.test(f.email)) return "Please add a valid email address.";
    return "";
  };
  const next = () => {
    const e = stepError(step);
    setError(e);
    if (!e) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  async function submit() {
    if (!f.consent) return setError("Please confirm we may contact you about this trip.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/enquiry/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "trip-request",
          name: f.name,
          email: f.email,
          phone: f.phone,
          country: f.country,
          trip: chosen ? chosen.title : f.places.join(", "),
          tripSlug: f.trip,
          places: f.places,
          interests: f.interests,
          date: f.flexible ? `${f.date || "Any time"} (flexible)` : f.date,
          duration: f.duration,
          travellers: `${f.adults} adult${f.adults === 1 ? "" : "s"}${f.children ? `, ${f.children} child${f.children === 1 ? "" : "ren"}` : ""}`,
          style: f.style,
          budget: f.budget,
          fitness: f.fitness,
          contactBy: f.contactBy,
          message: f.message,
          website: f.website,
        }),
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!json.ok) throw new Error(json.error ?? "Something went wrong. Please try again or WhatsApp us.");
      tellTawk("enquiry", { name: f.name, email: f.email, phone: f.phone, reference: json.reference, trip: chosen ? chosen.title : f.places.join(", ") });
      setRef(json.reference);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (ref) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-card p-6 text-center sm:p-12">
        <span className="bg-glacier-soft text-pine mx-auto grid size-16 place-items-center rounded-full">
          <CircleCheckBig className="size-8" aria-hidden />
        </span>
        <h3 className="font-display mt-6 text-3xl text-ink sm:text-4xl">
          Namaste, <span className="accent-word">your request is in.</span>
        </h3>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">Our Kathmandu team will reply by {f.contactBy.toLowerCase()} with ideas and a price for your trip.</p>
        <p className="mx-auto mt-5 inline-block rounded-lg bg-snow-2 px-4 py-2 font-mono text-sm">Reference {ref}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={whatsappHref(`Namaste, I just sent trip request ${ref}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 text-sm font-semibold">
            <WhatsappIcon className="size-4 text-[#25D366]" /> Follow up on WhatsApp
          </a>
          <Link href="/trip/" className="bg-pine hover:bg-pine-deep inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white">
            Keep exploring trips <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start lg:gap-8">
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-8">
        {/* Progress */}
        <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => i < step && setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className="group relative w-full text-left after:absolute after:-inset-y-3 after:inset-x-0 after:content-[''] disabled:cursor-default"
              >
                <span className={cn("block h-1 rounded-full transition-colors duration-500", i <= step ? "bg-pine" : "bg-line")} />
                <span className={cn("mt-2 hidden text-xs font-semibold sm:block", i === step ? "text-ink" : i < step ? "text-pine group-hover:underline" : "text-muted")}>
                  {i + 1}. {s}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs font-semibold text-muted sm:hidden">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28 }} className="mt-7">
            {step === 0 ? (
              <div className="space-y-7">
                <Field label="Start from one of our trips" id="r-trip" hint="Optional: we can change anything in it.">
                  <select id="r-trip" value={f.trip} onChange={(e) => set("trip", e.target.value)} className="input">
                    <option value="">I&apos;m not sure yet, help me choose</option>
                    {trips.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.title} · {t.days} {t.days === 1 ? "day" : "days"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Chips label="Where would you like to go?" options={PLACES} selected={f.places} onToggle={(v) => toggle("places", v)} />
                <Chips label="What should it include?" options={INTERESTS} selected={f.interests} onToggle={(v) => toggle("interests", v)} />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Preferred start date" id="r-date">
                  <input id="r-date" type="date" min={new Date().toISOString().slice(0, 10)} value={f.date} onChange={(e) => set("date", e.target.value)} className="input" />
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                    <input type="checkbox" checked={f.flexible} onChange={(e) => set("flexible", e.target.checked)} className="accent-[var(--pine)] size-4" /> My dates are flexible
                  </label>
                </Field>
                <Field label="Time available" id="r-dur">
                  <select id="r-dur" value={f.duration} onChange={(e) => set("duration", e.target.value)} className="input">
                    <option value="">Choose…</option>
                    {["Up to a week", "1–2 weeks", "2–3 weeks", "More than 3 weeks", "Flexible"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </Field>
                <Stepper label="Adults" value={f.adults} min={1} max={30} onChange={(v) => set("adults", v)} />
                <Stepper label="Children (under 16)" value={f.children} min={0} max={20} onChange={(v) => set("children", v)} />
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2.5 text-sm font-semibold">Trip style</legend>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {STYLES.map((o) => (
                      <Choice key={o.v} name="style" title={o.v} text={o.d} checked={f.style === o.v} onChange={() => set("style", o.v)} />
                    ))}
                  </div>
                </fieldset>
                <Field label="Budget per person" id="r-budget">
                  <select id="r-budget" value={f.budget} onChange={(e) => set("budget", e.target.value)} className="input">
                    <option value="">Choose…</option>
                    {["Under US$1,000", "US$1,000–2,000", "US$2,000–3,500", "Over US$3,500", "Not sure yet"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Fitness and experience" id="r-fit">
                  <select id="r-fit" value={f.fitness} onChange={(e) => set("fitness", e.target.value)} className="input">
                    <option value="">Choose…</option>
                    {["Easy: walks of 3–5 hours", "Moderate: regular hiker, 6 hours a day", "Strenuous: fit, trekked at altitude before"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" id="r-name">
                  <input id="r-name" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} className="input" />
                </Field>
                <Field label="Email address" id="r-email">
                  <input id="r-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} className="input" />
                </Field>
                <Field label="Phone / WhatsApp (optional)" id="r-phone">
                  <input id="r-phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} className="input" />
                </Field>
                <Field label="Country (optional)" id="r-country">
                  <CountrySelect id="r-country" value={f.country} onChange={(v) => set("country", v)} />
                </Field>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2.5 text-sm font-semibold">How should we reply?</legend>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: "Email", Icon: Mail },
                      { v: "WhatsApp", Icon: MessageCircle },
                      { v: "Phone", Icon: Phone },
                    ].map(({ v, Icon }) => (
                      <label key={v} className={cn("inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors", f.contactBy === v ? "border-pine bg-glacier-soft text-pine" : "border-line hover:border-pine/40")}>
                        <input type="radio" name="contactBy" className="sr-only" checked={f.contactBy === v} onChange={() => set("contactBy", v)} />
                        <Icon className="size-4" aria-hidden /> {v}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label="Anything else? (optional)" id="r-msg" wide>
                  <textarea id="r-msg" rows={4} value={f.message} onChange={(e) => set("message", e.target.value)} className="input py-3" placeholder="Special interests, a celebration, places you'd love to see…" />
                </Field>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} className="hidden" aria-hidden />
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <dl className="divide-y divide-line rounded-xl border border-line">
                  <Review label="Trip" onEdit={() => setStep(0)} value={[chosen?.title, f.places.join(", "), f.interests.join(", ")].filter(Boolean).join(" · ") || "Not sure yet"} />
                  <Review label="When" onEdit={() => setStep(1)} value={[f.date ? new Date(`${f.date}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null, f.flexible ? "flexible" : null, f.duration].filter(Boolean).join(" · ") || "Flexible"} />
                  <Review label="Who" onEdit={() => setStep(1)} value={`${f.adults} adult${f.adults === 1 ? "" : "s"}${f.children ? `, ${f.children} child${f.children === 1 ? "" : "ren"}` : ""}${f.style ? ` · ${f.style}` : ""}${f.budget ? ` · ${f.budget}` : ""}`} />
                  <Review label="You" onEdit={() => setStep(2)} value={[f.name, f.email, f.phone, f.country].filter(Boolean).join(" · ")} />
                  <Review label="Reply by" onEdit={() => setStep(2)} value={f.contactBy} />
                </dl>
                <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
                  <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="accent-[var(--pine)] mt-0.5 size-4 shrink-0" />
                  <span>
                    I agree that Base Camp Adventure may contact me about this trip. See our{" "}
                    <Link href="/privacy-policy/" className="text-pine underline">privacy policy</Link>.
                  </span>
                </label>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {error ? (
          <p role="alert" className="bg-crimson/10 text-crimson mt-5 rounded-lg px-4 py-3 text-sm font-medium">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <button type="button" onClick={() => { setError(""); setStep(step - 1); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-5 py-3.5 text-sm font-semibold">
              <ArrowLeft className="size-4" aria-hidden /> Back
            </button>
          ) : (
            <Link href="/trip/" className="text-center text-sm font-semibold text-muted hover:text-ink">
              Browse ready-made trips instead
            </Link>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="bg-pine hover:bg-pine-deep inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-sm font-bold text-white transition-colors">
              Continue <ArrowRight className="size-4" aria-hidden />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={busy} className="bg-pine hover:bg-pine-deep inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-sm font-bold text-white transition-colors disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Send my trip request
            </button>
          )}
        </div>
      </div>

      {/* Live summary */}
      <aside className="rounded-2xl border border-line bg-snow-2 p-5 sm:p-6 lg:sticky lg:top-28" aria-label="Your trip request so far">
        <p className="eyebrow text-pine">Your trip so far</p>
        <ul className="mt-4 space-y-3 text-sm">
          <Summary Icon={Mountain} label={chosen ? chosen.title : f.places.length ? f.places.join(", ") : "Where to: not chosen yet"} sub={chosen?.price ? `From US$${chosen.price.toLocaleString("en-US")} per person · ${chosen.days} days` : f.interests.join(", ") || undefined} />
          <Summary Icon={CalendarDays} label={f.date ? new Date(`${f.date}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + (f.flexible ? " (flexible)" : "") : f.flexible ? "Flexible dates" : "Dates: not set yet"} sub={f.duration || undefined} />
          <Summary Icon={Users} label={`${f.adults} adult${f.adults === 1 ? "" : "s"}${f.children ? `, ${f.children} child${f.children === 1 ? "" : "ren"}` : ""}`} sub={[f.style, f.budget].filter(Boolean).join(" · ") || undefined} />
        </ul>
        <ul className="mt-6 space-y-2 border-t border-line pt-5 text-sm text-ink-soft">
          {["Free, with no obligation", "Planned by our Kathmandu team", "Every detail can change"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="text-pine size-4 shrink-0" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <a href={whatsappHref("Namaste, I'd like help planning a trip.")} target="_blank" rel="noopener noreferrer" className="mt-6 flex items-center gap-3 rounded-xl bg-card p-3.5 text-sm hover:ring-1 hover:ring-pine/30">
          <WhatsappIcon className="size-6 shrink-0 text-[#25D366]" />
          <span>
            <span className="block font-bold">Rather talk it through?</span>
            <span className="text-muted">WhatsApp {site.mobile}, available 24/7</span>
          </span>
        </a>
      </aside>
    </div>
  );
}

function Field({ label, id, hint, wide, children }: { label: string; id: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Chips({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button key={o} type="button" aria-pressed={on} onClick={() => onToggle(o)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors", on ? "border-pine bg-pine text-white" : "border-line bg-card hover:border-pine/40")}>
              {on ? <Check className="size-3.5" aria-hidden /> : null} {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Choice({ name, title, text, checked, onChange }: { name: string; title: string; text: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={cn("cursor-pointer rounded-xl border-2 p-3.5 transition-colors", checked ? "border-pine bg-glacier-soft" : "border-line hover:border-pine/40")}>
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onChange} />
      <span className="block font-bold">{title}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-muted">{text}</span>
    </label>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="inline-flex items-center rounded-lg border border-line bg-card">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`} className="grid size-11 place-items-center disabled:opacity-35">
          <Minus className="size-4" aria-hidden />
        </button>
        <span className="w-10 text-center font-bold tabular-nums" aria-live="polite">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`} className="grid size-11 place-items-center disabled:opacity-35">
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Review({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <dt className="text-[0.66rem] font-bold tracking-[0.12em] text-muted uppercase">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium break-words">{value || "—"}</dd>
      </div>
      <button type="button" onClick={onEdit} className="text-pine inline-flex shrink-0 items-center gap-1 text-xs font-bold hover:underline">
        <Pencil className="size-3" aria-hidden /> Edit
      </button>
    </div>
  );
}

function Summary({ Icon, label, sub }: { Icon: typeof Mountain; label: string; sub?: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-pine grid size-8 shrink-0 place-items-center rounded-lg bg-card">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-snug">{label}</span>
        {sub ? <span className="block text-xs text-muted">{sub}</span> : null}
      </span>
    </li>
  );
}
