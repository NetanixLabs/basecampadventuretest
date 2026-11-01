"use client";

import { ReviewVerified } from "@/components/review-verified";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import { Flag } from "@/components/flag";
import { cn, formatDate } from "@/lib/utils";

export type CarouselReview = {
  name: string;
  place: string | null;
  country: string | null;
  flag: string | null;
  body: string;
  rating: number;
  trip?: { slug: string; title: string };
  sourceUrl?: string;
  sourceLabel?: string;
  published?: string;
  publishedLabel?: string;
  isExcerpt?: boolean;
  title?: string;
  video?: { src: string; poster?: string };
};

const narrowQuery = "(max-width: 639px)";
const useNarrow = () =>
  useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(narrowQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(narrowQuery).matches,
    () => false,
  );

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "★";

/**
 * Reviews on a turning 3D stage: the one being read faces you, its
 * neighbours swing back in depth. Swipe, drag, the arrows or the keyboard
 * move it; it turns by itself every few seconds while in view, and stops
 * when you hover, focus or prefer reduced motion.
 */
export function ReviewCarousel({ items }: { items: CarouselReview[] }) {
  const reduce = useReducedMotion();
  const narrow = useNarrow();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const n = items.length;

  const go = useCallback((d: number) => {
    setOpen(null);
    setActive((a) => (a + d + n) % n);
  }, [n]);

  useEffect(() => {
    if (reduce || hold || !inView || n < 2) return;
    const t = setInterval(() => go(1), 6500);
    return () => clearInterval(t);
  }, [reduce, hold, inView, n, go]);

  if (!n) return null;

  return (
    <div
      ref={ref}
      role="region"
      aria-roledescription="carousel"
      aria-label="Traveller reviews"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
      className="outline-none"
    >
      <motion.div
        className="relative mx-auto h-[20rem] touch-pan-y select-none sm:h-[19rem] [perspective:1400px]"
        onPanEnd={(_, info) => {
          if (info.offset.x < -50) go(1);
          else if (info.offset.x > 50) go(-1);
        }}
      >
        {items.map((r, i) => {
          // Signed distance from the review being read, the short way round.
          let o = i - active;
          if (o > n / 2) o -= n;
          if (o < -n / 2) o += n;
          const d = Math.abs(o);
          const shown = d <= (narrow ? 1 : 2);
          const isActive = o === 0;
          return (
            <motion.div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${n}`}
              aria-hidden={!isActive}
              initial={false}
              animate={
                reduce
                  ? { x: "-50%", opacity: isActive ? 1 : 0, scale: 1, rotateY: 0, z: 0 }
                  : {
                      x: `calc(-50% + ${o * (narrow ? 88 : 64)}%)`,
                      rotateY: o * (narrow ? -18 : -30),
                      z: -d * 150,
                      scale: 1 - d * 0.08,
                      opacity: shown ? 1 - d * (narrow ? 0.45 : 0.32) : 0,
                    }
              }
              transition={{ type: "spring", stiffness: 160, damping: 24, mass: 0.9 }}
              style={{ zIndex: 20 - d, transformStyle: "preserve-3d", pointerEvents: shown ? "auto" : "none" }}
              className="absolute top-0 left-1/2 h-full w-[88%] max-w-[34rem] sm:w-[32rem]"
            >
              <div
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 transition-shadow duration-500 sm:p-6",
                  isActive ? "border-pine/25 shadow-[0_40px_80px_-40px_oklch(0.25_0.06_210/0.55)]" : "border-line shadow-[0_20px_40px_-34px_oklch(0.25_0.06_210/0.5)]",
                )}
              >
                {/* Soft light across the face of the card */}
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.55),transparent_38%)] opacity-60 dark:bg-[linear-gradient(130deg,rgba(255,255,255,0.07),transparent_40%)]" />
                <div className="relative flex items-center justify-between">
                  <span className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className={s < Math.round(r.rating) ? "fill-marigold text-marigold size-4" : "size-4 text-line"} aria-hidden />
                    ))}
                  </span>
                  <Quote className="text-pine/25 size-6" aria-hidden />
                </div>
                {r.title ? <h3 className="relative mt-2 line-clamp-2 shrink-0 text-sm font-bold text-ink">{r.title}</h3> : null}
                <blockquote
                  className={cn(
                    "relative mt-3 min-h-0 flex-1 text-[0.9rem] leading-relaxed text-ink-soft",
                    open === i ? "overflow-y-auto pr-1" : "line-clamp-4 sm:line-clamp-5",
                  )}
                  data-lenis-prevent
                >
                  {r.body ? <><span className="whitespace-pre-line">&ldquo;{r.body}&rdquo;</span>{r.isExcerpt ? <span className="mt-1 block text-xs font-semibold text-muted">Excerpt</span> : null}</> : <span className="text-muted">This traveller left a star rating without a written comment.</span>}
                </blockquote>
                {isActive && r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="relative mt-2 self-start text-sm font-bold text-pine hover:underline">{r.isExcerpt ? "Read complete review on" : "Read on"} {r.sourceLabel ?? "source"}</a> : null}
                {isActive && r.body.length > 180 ? (
                  <button type="button" onClick={() => setOpen(open === i ? null : i)} className="text-pine relative mt-2 self-start text-sm font-bold hover:underline">
                    {open === i ? "Show less" : r.isExcerpt ? "Expand excerpt" : "Read full review"}
                  </button>
                ) : null}
                <figcaption className="relative mt-3 flex shrink-0 items-center gap-3 border-t border-line pt-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#00afc4] to-[#00788a] text-xs font-bold text-white shadow-inner">
                    {initials(r.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="truncate">{r.name}</span>
                      {r.flag && r.country ? <Flag svg={r.flag} label={r.country} /> : null}
                      <ReviewVerified />
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {r.place ? `${r.place} · ` : ""}
                      {r.trip ? <Link href={`/trip/${r.trip.slug}/`} tabIndex={isActive ? 0 : -1} className="text-pine hover:underline">{r.trip.title}</Link> : r.published ? <time dateTime={r.published}>{formatDate(r.published)} · {r.sourceLabel ?? "Traveller"} review</time> : r.publishedLabel ? <span>{r.publishedLabel} · {r.sourceLabel ?? "Traveller"} review</span> : null}
                    </span>
                  </span>
                </figcaption>
                {!isActive ? (
                  <button type="button" onClick={() => go(o)} tabIndex={-1} aria-label={`Show review by ${r.name}`} className="absolute inset-0 cursor-pointer" />
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button type="button" onClick={() => go(-1)} aria-label="Previous review" className="hover:border-pine grid size-10 place-items-center rounded-full border border-line bg-card transition-colors">
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {n > 12 ? <span className="min-w-14 text-center text-xs font-semibold text-muted">{active + 1} / {n}</span> : items.map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all duration-500", i === active ? "bg-pine w-6" : "w-1.5 bg-line")} />
          ))}
        </div>
        <span className="sr-only" aria-live="polite">
          Review {active + 1} of {n}
        </span>
        <button type="button" onClick={() => go(1)} aria-label="Next review" className="hover:border-pine grid size-10 place-items-center rounded-full border border-line bg-card transition-colors">
          <ArrowRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
