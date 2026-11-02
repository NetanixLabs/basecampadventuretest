"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Compass, Landmark, Mountain, MountainSnow, RotateCcw, Sailboat, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { TripCard } from "@/components/trip-card";
import type { TripCard as Card } from "@/lib/types";
import { cn } from "@/lib/utils";

type Answers = { style?: string; days?: string; altitude?: string; budget?: string; region?: string };
type Opt = { value: string; label: string; hint?: string; Icon?: typeof Mountain };
type Q = { key: keyof Answers; title: string; options: Opt[]; skip?: (a: Answers) => boolean };

const STYLE: Record<string, string[]> = {
  trek: ["trekking-in-nepal"],
  climb: ["nepal-peak-climbing"],
  culture: ["nepal-tour", "day-tours"],
  rafting: ["river-rafting-in-nepal"],
  bhutan: ["tours-in-bhutan"],
  tibet: ["tours-in-tibet"],
};
const DAYS: Record<string, [number, number]> = { short: [1, 7], mid: [8, 12], long: [13, 17], epic: [18, 60] };
const ALT: Record<string, [number, number]> = { low: [0, 3999], mid: [4000, 5199], high: [5200, 9000] };
const BUDGET: Record<string, [number, number]> = { b1: [0, 799], b2: [800, 1499], b3: [1500, 2499], b4: [2500, 100000] };

const QUESTIONS: Q[] = [
  { key: "style", title: "What kind of trip are you dreaming of?", options: [
    { value: "trek", label: "Trekking", hint: "Walk village to village, mountain views every day", Icon: Mountain },
    { value: "climb", label: "Peak climbing", hint: "Stand on a Himalayan summit", Icon: MountainSnow },
    { value: "culture", label: "Culture & tours", hint: "Temples, cities, wildlife, easy days", Icon: Landmark },
    { value: "rafting", label: "Rafting", hint: "Rivers, rapids and riverside camps", Icon: Sailboat },
    { value: "bhutan", label: "Bhutan", hint: "Dzongs, festivals, the Tiger's Nest", Icon: Compass },
    { value: "tibet", label: "Tibet", hint: "Lhasa, monasteries, Everest North", Icon: Compass },
  ] },
  { key: "days", title: "How many days do you have in the region?", options: [
    { value: "short", label: "Up to a week" }, { value: "mid", label: "8–12 days" }, { value: "long", label: "13–17 days" }, { value: "epic", label: "18 days or more" },
  ] },
  { key: "altitude", title: "How high would you like to go?", skip: (a) => Boolean(a.style) && !["trek", "climb"].includes(a.style ?? ""), options: [
    { value: "low", label: "Below 4,000 m", hint: "Gentle, great views, low altitude risk" },
    { value: "mid", label: "4,000 – 5,200 m", hint: "Classic base camps and viewpoints" },
    { value: "high", label: "Above 5,200 m", hint: "High passes, Kala Patthar, summits" },
  ] },
  { key: "budget", title: "What's your budget per person (excluding flights to Nepal)?", options: [
    { value: "b1", label: "Under US$800" }, { value: "b2", label: "US$800 – 1,500" }, { value: "b3", label: "US$1,500 – 2,500" }, { value: "b4", label: "US$2,500 or more" },
  ] },
  { key: "region", title: "Any region in mind?", skip: (a) => Boolean(a.style) && a.style !== "trek", options: [
    { value: "everest-region", label: "Everest" }, { value: "annapurna-region", label: "Annapurna" }, { value: "langtang-region", label: "Langtang" }, { value: "manaslu-region", label: "Manaslu" }, { value: "remote-area-trekking", label: "Off the beaten track" }, { value: "any", label: "Surprise me" },
  ] },
];

const within = (v: number | null | undefined, [a, b]: [number, number]) => v != null && v >= a && v <= b;
const near = (v: number | null | undefined, [a, b]: [number, number], slack: number) => v != null && v >= a - slack && v <= b + slack;

function score(t: Card, a: Answers) {
  if (a.style && !t.activities.some((x) => STYLE[a.style!].includes(x))) return null;
  let s = 40;
  let max = 40;
  const why: string[] = [];
  if (a.days) {
    max += 25;
    if (within(t.days, DAYS[a.days])) { s += 25; why.push(`${t.days} days`); }
    else if (near(t.days, DAYS[a.days], 2)) s += 12;
  }
  if (a.altitude && t.maxAltitude) {
    max += 20;
    if (within(t.maxAltitude, ALT[a.altitude])) { s += 20; why.push(`up to ${t.maxAltitude.toLocaleString("en-US")} m`); }
    else if (near(t.maxAltitude, ALT[a.altitude], 300)) s += 8;
  }
  if (a.budget && !t.price) { max += 15; s += 7; }
  if (a.budget && t.price) {
    max += 15;
    if (within(t.price.amount, BUDGET[a.budget])) { s += 15; why.push("in your budget"); }
    else if (t.price.amount < BUDGET[a.budget][0]) s += 8;
  }
  if (a.region) {
    max += 10;
    if (a.region === "any" || t.destinations.includes(a.region)) { s += 10; if (a.region !== "any") why.push("your region"); }
  }
  if (t.rating) s += 1;
  return { pct: Math.min(99, Math.round((s / max) * 100)), why };
}

/** Five quick questions, then the trips that fit best. Nothing is sent anywhere. */
export function TripFinder({ trips, regionNames }: { trips: Card[]; regionNames: Record<string, string> }) {
  const [a, setA] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const qs = QUESTIONS.filter((q) => !q.skip?.(a));
  const done = step >= qs.length;
  const q = qs[Math.min(step, qs.length - 1)];

  const results = useMemo(() => {
    if (!done) return [];
    return trips
      .map((t) => ({ t, r: score(t, a) }))
      .filter((x): x is { t: Card; r: { pct: number; why: string[] } } => x.r !== null)
      .sort((x, y) => y.r.pct - x.r.pct || (y.t.rating?.count ?? 0) - (x.t.rating?.count ?? 0))
      .slice(0, 6);
  }, [done, trips, a]);

  const pick = (v: string) => {
    setA((o) => ({ ...o, [q.key]: v }));
    setStep((s) => s + 1);
    requestAnimationFrame(() => document.getElementById("finder")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const restart = () => { setA({}); setStep(0); };

  return (
    <div id="finder" className="scroll-mt-28">
      {!done ? (
        <div className="mx-auto max-w-3xl rounded-3xl border border-line bg-card p-6 shadow-[0_30px_60px_-40px_oklch(0.2_0.04_170/0.55)] sm:p-10">
          <div className="flex items-center justify-between gap-4 text-xs font-bold tracking-[0.14em] text-muted uppercase">
            <span>Question {step + 1} of {qs.length}</span>
            {step > 0 ? <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1 normal-case tracking-normal text-pine hover:underline"><ArrowLeft className="size-4" aria-hidden /> Back</button> : null}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-snow-2" aria-hidden><div className="h-full rounded-full bg-pine transition-all duration-500" style={{ width: `${(step / qs.length) * 100}%` }} /></div>
          <h2 className="font-display mt-8 text-[clamp(1.6rem,3vw,2.4rem)] leading-tight tracking-tight">{q.title}</h2>
          <div className={cn("mt-6 grid gap-3", q.options.length > 4 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")} role="radiogroup" aria-label={q.title}>
            {q.options.map(({ value, label, hint, Icon }) => {
              const on = a[q.key] === value;
              return (
                <button key={value} type="button" role="radio" aria-checked={on} onClick={() => pick(value)} className={cn("group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-pine hover:shadow-md", on ? "border-pine bg-pine/5" : "border-line bg-card")}>
                  {Icon ? <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pine/10 text-pine transition-colors group-hover:bg-pine group-hover:text-white"><Icon className="size-5" aria-hidden /></span> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{label}</span>
                    {hint ? <span className="mt-0.5 block text-sm text-muted">{hint}</span> : null}
                  </span>
                  {on ? <Check className="size-5 shrink-0 text-pine" aria-hidden /> : <ArrowRight className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow inline-flex items-center gap-2 text-pine"><Sparkles className="size-4" aria-hidden /> Your matches</p>
              <h2 className="font-display mt-2 text-[clamp(1.8rem,3.4vw,3rem)] leading-tight tracking-tight">{results.length ? "Trips that fit you best" : "Nothing fits exactly, but we can build it"}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={restart} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold hover:border-pine"><RotateCcw className="size-4" aria-hidden /> Start again</button>
              <Link href="/customize-trip/#request" className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-sm font-bold text-white hover:bg-pine-deep">Plan a custom trip <ArrowRight className="size-4" aria-hidden /></Link>
            </div>
          </div>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(({ t, r }, i) => (
              <div key={t.slug} className="flex flex-col">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", i === 0 ? "bg-marigold text-pine-night" : "bg-pine/10 text-pine")}>{i === 0 ? "Best match · " : ""}{r.pct}% match</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-snow-2" aria-hidden><span className="block h-full rounded-full bg-pine" style={{ width: `${r.pct}%` }} /></span>
                </div>
                <TripCard trip={t} regionName={regionNames[t.destinations[0]]} className="h-auto flex-1" />
                {r.why.length ? <p className="mt-2.5 flex flex-wrap gap-1.5 text-xs">{r.why.map((w) => <span key={w} className="inline-flex items-center gap-1 rounded-full bg-pine/8 px-2 py-0.5 font-semibold text-pine"><Check className="size-3" aria-hidden />{w}</span>)}</p> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
