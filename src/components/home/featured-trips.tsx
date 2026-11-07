"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { TripCard } from "@/components/trip-card";
import type { TripCard as Card } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TripGroup = { key: string; label: string; trips: Card[]; href: string };

/**
 * "Where do you want to go?": the prototype's search bar, region chips, and
 * the trips re-shuffling in place as a region is picked.
 */
export function FeaturedTrips({ groups, regionNames, regions }: { groups: TripGroup[]; regionNames: Record<string, string>; regions: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [key, setKey] = useState(groups[0].key);
  const [region, setRegion] = useState("");
  const [days, setDays] = useState("");
  const [budget, setBudget] = useState("");
  const group = groups.find((g) => g.key === key) ?? groups[0];

  return (
    <LayoutGroup>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = new URLSearchParams();
          if (region) q.set("region", region);
          if (days) q.set("days", days);
          if (budget) q.set("budget", budget);
          router.push(`/trip/${q.size ? `?${q}` : ""}`);
        }}
        className="grid gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]"
        aria-label="Find your trip"
      >
        <Select id="ft-region" label="Destination" value={region} onChange={setRegion} options={[{ v: "", l: "Anywhere in Nepal" }, ...regions.map((r) => ({ v: r.slug, l: r.name }))]} />
        <Select
          id="ft-days"
          label="Time on the trail"
          value={days}
          onChange={setDays}
          options={[
            { v: "", l: "Any duration" },
            { v: "short", l: "Up to 7 days" },
            { v: "mid", l: "8–14 days" },
            { v: "long", l: "15 days or more" },
          ]}
        />
        <Select
          id="ft-budget"
          label="Your budget"
          value={budget}
          onChange={setBudget}
          options={[
            { v: "", l: "Any budget" },
            { v: "1000", l: "Under US$1,000" },
            { v: "1500", l: "Under US$1,500" },
            { v: "2000", l: "Under US$2,000" },
          ]}
        />
        <div className="bg-glacier-soft grid place-items-center p-3 sm:col-span-3 lg:col-span-1">
          <button type="submit" className="bg-pine hover:bg-pine-deep w-full rounded-lg px-7 py-3.5 text-sm font-bold text-white transition-colors">
            Find my trip
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter trips by region">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={g.key === key}
              onClick={() => setKey(g.key)}
              className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors", g.key === key ? "text-white" : "border border-line bg-card text-ink-soft hover:text-ink")}
            >
              {g.key === key ? <motion.span layoutId="trip-tab" className="bg-pine absolute inset-0 rounded-full" transition={{ type: "spring", stiffness: 380, damping: 32 }} /> : null}
              <span className="relative">{g.label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{Math.min(group.trips.length, 8)} handpicked trips</p>
      </div>

      <motion.div layout className="rail mt-6 package-grid-gap grid sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {group.trips.slice(0, 8).map((t, i) => (
            <motion.div
              key={`${group.key}-${t.slug}`}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              <TripCard trip={t} regionName={regionNames[t.destinations[0]]} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Link href={group.href} className="border-b-2 border-ink pb-1 text-sm font-bold">
          Explore the full collection
        </Link>
      </div>
    </LayoutGroup>
  );
}

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label htmlFor={id} className="bg-glacier-soft flex cursor-pointer flex-col gap-1 px-4 py-3">
      <span className="text-[0.62rem] font-bold tracking-[0.14em] text-muted uppercase">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full cursor-pointer bg-transparent text-[0.95rem] font-semibold text-ink outline-none">
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    </label>
  );
}
