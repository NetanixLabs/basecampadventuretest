"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BedDouble, ChevronDown, Coffee, Mountain, Route, Sandwich, Timer, UtensilsCrossed } from "lucide-react";
import { accommodationPlaceOf, distanceOf, distanceEstimateOf, distanceLabels, durationOf, placeOf } from "@/lib/itinerary";
import { AccommodationFact } from "@/components/trip/accommodation-fact";
import { photoOfPlace, type PlacePhoto } from "@/lib/place-photos";
import type { ItineraryDay } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Day-by-day timeline. Each day shows only what it has: altitude, distance,
 * duration, accommodation and meals. Every day's text is in the HTML
 * even when folded.
 */
export function Itinerary({ days }: { days: ItineraryDay[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set([1]));
  const all = open.size === days.length;

  const toggle = (d: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(d)) n.delete(d);
      else n.add(d);
      return n;
    });

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button type="button" onClick={() => setOpen(all ? new Set() : new Set(days.map((d) => d.day)))} className="text-pine text-sm font-bold hover:underline relative after:absolute after:-inset-y-3 after:-inset-x-1.5 after:content-['']">
          {all ? "Collapse all days" : "Expand all days"}
        </button>
      </div>
      <ol className="relative">
        <span aria-hidden className="absolute top-3 bottom-3 left-[1.15rem] w-px bg-gradient-to-b from-glacier via-pine/30 to-marigold" />
        {days.map((d, index) => {
          const isOpen = open.has(d.day);
          const km = distanceOf(d);
          const estimate = distanceEstimateOf(d, days[index - 1]);
          const labels = distanceLabels(km, estimate);
          const travelDay = /trek|drive|hike|walk|flight|fly|ride|rafting|sightseeing|tour|^day\s*\d+/i.test(d.title) && !/rest|acclimati|departure/i.test(d.title);
          const duration = durationOf(d);
          // Use the recorded overnight stop, the day description, or its destination.
          const place = accommodationPlaceOf(d);
          const photo = itineraryPhoto(d, place);
          const accommodation = place ? `${place} - Guest house` : d.accommodation?.trim() || (!/departure|onward destination|fly (?:back )?home/i.test(d.title) && d.day < days.length ? "Not specified" : "");
          return (
            <li key={d.day} className="relative pb-3 pl-14">
              <span
                className={cn(
                  "absolute top-2.5 left-0 grid size-[2.3rem] place-items-center rounded-full border-2 font-mono text-xs font-medium transition-colors",
                  isOpen ? "bg-pine border-pine text-white" : "border-line bg-card text-ink",
                )}
              >
                {String(d.day).padStart(2, "0")}
              </span>
              <div className={cn("rounded-2xl border transition-colors", isOpen ? "border-pine/30 bg-card shadow-[0_18px_40px_-30px_oklch(0.2_0.04_170/0.5)]" : "border-line bg-card hover:border-pine/30")}>
                <h3>
                  <button type="button" onClick={() => toggle(d.day)} aria-expanded={isOpen} className="flex w-full items-start justify-between gap-4 p-4 text-left">
                    <span>
                      <span className="eyebrow text-muted">Day {d.day}</span>
                      <span className="mt-1 block font-semibold leading-snug">{d.title}</span>
                    </span>
                    <ChevronDown className={cn("mt-5 size-5 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} aria-hidden />
                  </button>
                </h3>
                {d.altitude || labels || duration || travelDay || photo ? (
                  <ul className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3.5 text-[0.8rem] text-ink-soft" aria-label={`Day ${d.day} at a glance`}>
                    {d.altitude || travelDay ? (
                      <li className="inline-flex items-center gap-1.5">
                        <Mountain className="text-pine size-3.5" aria-hidden /> {d.altitude ? `${d.altitude.toLocaleString("en-US")} m / ${Math.round(d.altitude / 0.3048).toLocaleString("en-US")} ft` : "Altitude not specified"}
                      </li>
                    ) : null}
                    {labels || travelDay ? (
                      <li className="inline-flex items-center gap-1.5">
                        <Route className="text-pine size-3.5" aria-hidden /> {labels?.imperial ?? "Distance not specified"}
                      </li>
                    ) : null}
                    {duration || travelDay ? (
                      <li className="inline-flex items-center gap-1.5">
                        <Timer className="text-pine size-3.5" aria-hidden /> {duration ?? "Duration not specified"}
                      </li>
                    ) : null}
                    {photo ? <li className="inline-flex items-center"><AccommodationFact value="" place={photo.name} images={photo} iconOnly /></li> : null}
                  </ul>
                ) : null}
                <motion.div initial={false} animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden" inert={!isOpen}>
                  <div className="px-4 pb-5">
                    {d.html ? <div className="prose-trail text-base" dangerouslySetInnerHTML={{ __html: withoutPhotos(d.html) }} /> : null}
                    {accommodation ? (
                      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {accommodation ? <Fact icon={<BedDouble className="size-4" aria-hidden />} label="Accommodation" value={accommodation} /> : null}
                      </dl>
                    ) : null}
                    {d.meals.length ? (
                      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Meals included">
                        {(["breakfast", "lunch", "dinner"] as const).map((m) => {
                          const on = d.meals.includes(m);
                          const Icon = m === "breakfast" ? Coffee : m === "lunch" ? Sandwich : UtensilsCrossed;
                          return (
                            <li key={m} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize", on ? "border-pine/30 bg-glacier-soft text-pine" : "border-line text-muted/60 line-through")}>
                              <Icon className="size-3.5" aria-hidden /> {m}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}

                  </div>
                </motion.div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-snow-2 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[0.66rem] font-bold tracking-[0.1em] text-muted uppercase">
        <span className="text-pine">{icon}</span>
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-1 text-[0.85rem] font-semibold leading-snug">
        {value}
      </dd>
    </div>
  );
}

/** Imported day descriptions may contain photos outside the gallery field. */
function withoutPhotos(html: string) {
  return html
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (figure) => /<img\b/i.test(figure) ? "" : figure)
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<p\b[^>]*>\s*<\/p>/gi, "");
}

/** Prefer the overnight destination; use that day's own gallery when supplied. */
function itineraryPhoto(day: ItineraryDay, place: string): PlacePhoto | undefined {
  const destination = photoOfPlace(place) ?? photoOfPlace(placeOf(day.title));
  if (destination) return destination;
  if (!day.images?.length) return undefined;
  const images = day.images.map((image) => ({ src: image.src, alt: image.alt || day.title, author: "", license: "", licenseUrl: "", source: "" }));
  return { ...images[0], name: place || `Day ${day.day}`, images: images.slice(1) };
}
