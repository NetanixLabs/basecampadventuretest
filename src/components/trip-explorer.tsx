"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, Compass, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Portal } from "@/components/portal";
import { TripCard } from "@/components/trip-card";
import type { TripCard as Card } from "@/lib/types";
import { cn } from "@/lib/utils";

type Opt = { slug: string; name: string; count: number };

const DURATIONS = [
  { v: "", l: "Any duration" },
  { v: "short", l: "Up to 7 days", test: (d: number) => d <= 7 },
  { v: "mid", l: "8–14 days", test: (d: number) => d >= 8 && d <= 14 },
  { v: "long", l: "15+ days", test: (d: number) => d >= 15 },
];
const BUDGETS = [
  { v: "", l: "Any budget" },
  { v: "1000", l: "Under $1,000" },
  { v: "1500", l: "Under $1,500" },
  { v: "2000", l: "Under $2,000" },
];
const SORTS = [
  { v: "popular", l: "Most popular" },
  { v: "price-asc", l: "Price: low to high" },
  { v: "price-desc", l: "Price: high to low" },
  { v: "days-asc", l: "Shortest first" },
  { v: "days-desc", l: "Longest first" },
  { v: "altitude", l: "Highest first" },
];

export function TripExplorer({
  trips,
  regions,
  activities,
  regionNames,
  lockRegion,
  lockActivity,
}: {
  trips: Card[];
  regions: Opt[];
  activities: Opt[];
  regionNames: Record<string, string>;
  /** On a destination or activity page that filter is fixed. */
  lockRegion?: string;
  lockActivity?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [sheet, setSheet] = useState(false);

  const state = {
    q: params.get("q") ?? "",
    region: lockRegion ?? params.get("region") ?? "",
    activity: lockActivity ?? params.get("activity") ?? "",
    days: params.get("days") ?? "",
    budget: params.get("budget") ?? "",
    sort: params.get("sort") ?? "popular",
  };
  const [q, setQ] = useState(state.q);

  const set = (patch: Partial<typeof state>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (lockRegion) next.delete("region");
    if (lockActivity) next.delete("activity");
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  const results = useMemo(() => {
    const needle = state.q.trim().toLowerCase();
    const dur = DURATIONS.find((d) => d.v === state.days);
    const budget = Number(state.budget) || 0;
    const list = trips.filter(
      (t) =>
        (!needle || t.title.toLowerCase().includes(needle) || t.summary.toLowerCase().includes(needle)) &&
        (!state.region || t.destinations.includes(state.region)) &&
        (!state.activity || state.activity.split(",").some((activity) => t.activities.includes(activity))) &&
        (!dur?.test || dur.test(t.days)) &&
        (!budget || (t.price && t.price.amount < budget)),
    );
    const price = (t: Card) => t.price?.amount ?? Number.POSITIVE_INFINITY;
    const sorters: Record<string, (a: Card, b: Card) => number> = {
      popular: (a, b) => (b.rating?.count ?? 0) - (a.rating?.count ?? 0) || (b.price ? 1 : 0) - (a.price ? 1 : 0),
      "price-asc": (a, b) => price(a) - price(b),
      "price-desc": (a, b) => (b.price?.amount ?? -1) - (a.price?.amount ?? -1),
      "days-asc": (a, b) => a.days - b.days,
      "days-desc": (a, b) => b.days - a.days,
      altitude: (a, b) => (b.maxAltitude ?? 0) - (a.maxAltitude ?? 0),
    };
    return [...list].sort(sorters[state.sort] ?? sorters.popular);
  }, [trips, state.q, state.region, state.activity, state.days, state.budget, state.sort]);

  const combinedActivity = state.activity.includes(",");
  const activityLabel = state.activity === "nepal-peak-climbing,expedition-in-nepal"
    ? "Peak Climbing / Expeditions"
    : state.activity.split(",").map((slug) => activities.find((a) => a.slug === slug)?.name ?? slug).join(" / ");
  const active = [
    !lockRegion && state.region && { k: "region", l: state.region === "remote-area-trekking" ? "More Treks" : regionNames[state.region] ?? state.region },
    !lockActivity && state.activity && { k: "activity", l: activityLabel },
    state.days && { k: "days", l: DURATIONS.find((d) => d.v === state.days)?.l },
    state.budget && { k: "budget", l: BUDGETS.find((b) => b.v === state.budget)?.l },
    state.q && { k: "q", l: `“${state.q}”` },
  ].filter(Boolean) as { k: keyof typeof state; l: string }[];

  const controls = (p: string) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
      {!lockActivity ? (
        <Select id={`${p}-activity`} label="Activity" value={state.activity} onChange={(v) => set({ activity: v })} options={[{ v: "", l: "All activities" }, ...(combinedActivity ? [{ v: state.activity, l: activityLabel }] : []), ...activities.map((a) => ({ v: a.slug, l: `${a.name} (${a.count})` }))]} />
      ) : null}
      <Select id={`${p}-days`} label="Duration" value={state.days} onChange={(v) => set({ days: v })} options={DURATIONS} />
      <Select id={`${p}-budget`} label="Budget" value={state.budget} onChange={(v) => set({ budget: v })} options={BUDGETS} />
      <Select id={`${p}-sort`} label="Sort" value={state.sort} onChange={(v) => set({ sort: v === "popular" ? "" : v })} options={SORTS} />
    </div>
  );

  return (
    <div>
      <div data-subnav className="sticky top-[4.5rem] z-30 -mx-1.5 pt-4 sm:-mx-0 lg:top-[5.25rem]">
        <div className="rounded-2xl border border-line bg-card/92 p-2 shadow-[0_14px_40px_-26px_oklch(0.2_0.04_170/0.45)] backdrop-blur-xl sm:p-2.5">
        <div className="flex flex-row gap-2 lg:items-center lg:gap-3">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q });
            }}
            className="relative flex-1 lg:max-w-sm"
          >
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="f-q" className="sr-only">Search trips</label>
            <input
              id="f-q"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (!e.target.value) set({ q: "" });
              }}
              onBlur={() => q !== state.q && set({ q })}
              placeholder="Search Everest, Poon Hill, Island Peak…"
              className="h-11 w-full rounded-xl border border-line bg-snow pr-4 pl-11 text-sm outline-none transition focus:border-pine focus:bg-card focus:ring-4 focus:ring-pine/10"
            />
          </form>
          <div className="hidden lg:block">{controls("f")}</div>
          <button type="button" onClick={() => setSheet(true)} aria-label="Filters and sort" className="relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white lg:hidden">
            <SlidersHorizontal className="size-4" aria-hidden /> <span className="hidden sm:inline">Filters</span> {active.length ? <span className="bg-pine grid size-5 place-items-center rounded-full text-[0.7rem] text-white">{active.length}</span> : null}
          </button>
        </div>

        {!lockRegion ? (
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto" role="group" aria-label="Region">
            <Chip on={!state.region} onClick={() => set({ region: "" })}>All regions</Chip>
            {regions.map((r) => (
              <Chip key={r.slug} on={state.region === r.slug} onClick={() => set({ region: state.region === r.slug ? "" : r.slug })}>
                {r.slug === "remote-area-trekking" ? "More Treks" : r.name} <span className="font-mono text-[0.7rem] opacity-60">{r.count}</span>
              </Chip>
            ))}
          </div>
        ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          Showing <strong className="text-ink">{results.length}</strong> of {trips.length} trips
        </p>
        {active.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <button key={a.k} type="button" onClick={() => { if (a.k === "q") setQ(""); set({ [a.k]: "" }); }} className="inline-flex items-center gap-1.5 rounded-full bg-pine/10 px-3 py-1.5 text-sm font-medium text-pine">
                {a.l} <X className="size-3.5" aria-hidden />
              </button>
            ))}
            <button type="button" onClick={() => { setQ(""); router.replace(pathname, { scroll: false }); }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
              <RotateCcw className="size-3.5" aria-hidden /> Clear all
            </button>
          </div>
        ) : null}
      </div>

      {results.length ? (
        <Results key={params.toString()} trips={results} regionNames={regionNames} />
      ) : (
        <div className="mt-10 flex flex-col items-center rounded-[2rem] border border-dashed border-line px-6 py-16 text-center">
          <Compass className="text-pine size-10" aria-hidden />
          <h2 className="font-display mt-4 text-4xl font-black uppercase">A different route?</h2>
          <p className="mt-2 max-w-md text-ink-soft">Try a wider budget or duration, or let us put together a trip for you.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => { setQ(""); router.replace(pathname, { scroll: false }); }} className="rounded-full border border-line bg-card px-6 py-3 font-semibold">Show all trips</button>
            <Link href="/customize-trip/" className="bg-pine inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white">
              Plan a custom trip <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}

      {/* Mobile filter sheet */}
      <Portal>
      <AnimatePresence>
        {sheet ? (
          <m.div data-lenis-prevent className="fixed inset-0 z-[200] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close filters" className="absolute inset-0 bg-pine-night/50" onClick={() => setSheet(false)} />
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="bg-snow pb-safe absolute inset-x-0 bottom-0 rounded-t-[2rem] p-6"
            >
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-line" />
              <p className="font-display mb-5 text-3xl font-black uppercase">Filters</p>
              {controls("m")}
              <button type="button" onClick={() => setSheet(false)} className="bg-pine mt-6 w-full rounded-full py-4 font-bold text-white">
                Show {results.length} trips
              </button>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
      </Portal>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
        on ? "bg-pine text-white" : "bg-snow-2/70 text-ink-soft hover:bg-snow-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label htmlFor={id} className="relative flex h-11 items-center gap-2 rounded-xl border border-line bg-snow pl-3.5 pr-2.5 text-sm focus-within:border-pine">
      <span className="text-muted">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 cursor-pointer bg-transparent font-semibold outline-none">
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    </label>
  );
}

/** The matching trips, twelve at a time. All are in the page; the rest stay folded until "Show more". */
function Results({ trips, regionNames }: { trips: Card[]; regionNames: Record<string, string> }) {
  const [shown, setShown] = useState(12);
  const left = trips.length - shown;
  return (
    <>
      <m.div layout className="mt-8 package-grid-gap grid sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {trips.slice(0, shown).map((t, i) => (
            <m.div
              key={t.slug}
              layout
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.45, delay: Math.min(i % 12, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
            >
              <TripCard trip={t} regionName={regionNames[t.destinations[0]]} priority={i < 3} />
            </m.div>
          ))}
        </AnimatePresence>
      </m.div>
      {left > 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button type="button" onClick={() => setShown((n) => n + 12)} className="hover:border-pine inline-flex items-center gap-2 rounded-lg border border-line bg-card px-6 py-3.5 text-sm font-bold transition-colors">
            Show {Math.min(12, left)} more trips
          </button>
          <p className="text-xs text-muted">
            Showing {shown} of {trips.length}
          </p>
        </div>
      ) : null}
    </>
  );
}
