"use client";

import { ReviewVerified } from "@/components/review-verified";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import { EASE } from "@/components/motion";

export type Featured = { name: string; from: string | null; body: string; trip: { slug: string; title: string } };

/** One review at a time, large, turning every eight seconds unless paused by hover. */
export function FeaturedReviews({ items }: { items: Featured[] }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (reduce || hold || items.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 8000);
    return () => clearInterval(t);
  }, [reduce, hold, items.length]);

  if (!items.length) return null;
  const r = items[i];
  const go = (d: number) => setI((n) => (n + d + items.length) % items.length);

  return (
    <figure
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      className="bg-pine relative flex h-full min-h-[24rem] flex-col overflow-hidden rounded-[1.4rem] p-6 text-white sm:p-10 dark:bg-pine-deep"
    >
      <div aria-hidden className="blueprint absolute inset-0 text-white opacity-[0.07]" />
      <Quote aria-hidden className="absolute -top-4 right-4 size-40 rotate-180 text-white/10 sm:size-52" />
      <div className="relative flex gap-1" role="img" aria-label="5 out of 5">
        {Array.from({ length: 5 }).map((_, s) => (
          <Star key={s} className="size-4 fill-white text-white" aria-hidden />
        ))}
      </div>
      <div className="relative mt-6 flex-1" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: EASE }}>
            <blockquote className="text-[1.15rem] leading-relaxed sm:text-[1.35rem] sm:leading-[1.55]">&ldquo;{r.body}&rdquo;</blockquote>
            <figcaption className="mt-6">
              <p className="flex items-center gap-1.5 font-bold">{r.name}<ReviewVerified /></p>
              <p className="text-sm text-white/75">
                {r.from ? `${r.from} · ` : ""}
                <Link href={`/trip/${r.trip.slug}/`} className="underline decoration-white/40 underline-offset-4 hover:decoration-white">
                  {r.trip.title}
                </Link>
              </p>
            </figcaption>
          </motion.div>
        </AnimatePresence>
      </div>
      {items.length > 1 ? (
        <div className="relative mt-8 flex items-center justify-between gap-4">
          <div className="flex gap-1.5">
            {items.map((_, n) => (
              <button key={n} type="button" onClick={() => setI(n)} aria-label={`Review ${n + 1}`} aria-current={n === i} className={`h-1.5 rounded-full transition-all duration-500 ${n === i ? "w-7 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => go(-1)} aria-label="Previous review" className="grid size-10 place-items-center rounded-full border border-white/30 transition-colors hover:bg-white/10">
              <ArrowLeft className="size-4" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next review" className="grid size-10 place-items-center rounded-full border border-white/30 transition-colors hover:bg-white/10">
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </figure>
  );
}
