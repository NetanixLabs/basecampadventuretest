"use client";

import Image from "@/components/image";
import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { PhotoGlow } from "@/components/photo-glow";
import { CardActions } from "@/components/shortlist";
import type { TripCard as Card } from "@/lib/types";
import { cn, usd } from "@/lib/utils";

/**
 * Package card, in the prototype's layout: photograph on top with a label,
 * then region and days, the trip name, the price and "Explore trip".
 *
 * Compact enough for four in a row. On a mouse it tilts gently toward the
 * pointer with a soft glare; on touch and with reduced motion it stays still.
 */
export function TripCard({
  trip,
  regionName,
  label,
  priority = false,
  className,
  imageSizes = "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 24vw",
  imageQuality = 80,
}: {
  trip: Card;
  regionName?: string;
  /** Short tag on the photograph; defaults to the region. */
  label?: string;
  priority?: boolean;
  className?: string;
  imageSizes?: string;
  imageQuality?: number;
  size?: "md" | "lg";
}) {
  const reduce = useReducedMotion();
  const [fine, setFine] = useState(false);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 170, damping: 18, mass: 0.4 };
  const rx = useSpring(useTransform(py, [0, 1], [4, -4]), spring);
  const ry = useSpring(useTransform(px, [0, 1], [-5, 5]), spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(16rem circle at ${gx} ${gy}, rgba(255,255,255,0.18), transparent 60%)`;
  const tilt = fine && !reduce;

  const off = trip.price?.regular && trip.price.amount < trip.price.regular ? Math.round((1 - trip.price.amount / trip.price.regular) * 100) : null;
  const photoTag = label ?? regionName?.replace(" Region", "");
  const tag = photoTag?.trim().toLowerCase() === "other treks" ? undefined : photoTag;

  return (
    <motion.article
      onPointerEnter={(e) => setFine(e.pointerType === "mouse")}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
      style={tilt ? { rotateX: rx, rotateY: ry, transformPerspective: 1100 } : undefined}
      className={cn("package-card group relative isolate h-full", className)}
    >
      {trip.cover ? <PhotoGlow src={trip.cover.src} strength="sm" /> : null}
      <Link
        href={`/trip/${trip.slug}/`}
        className="relative flex h-full flex-col overflow-hidden rounded-[1.1rem] border border-line bg-card transition-[box-shadow,border-color] duration-500 group-hover:border-pine/30 group-hover:shadow-[0_22px_48px_-26px_oklch(0.25_0.05_210/0.45)]"
      >
        <div className="relative aspect-[3/2] overflow-hidden bg-snow-2">
          {trip.cover ? (
            <Image
              src={trip.cover.src}
              alt={trip.cover.alt || trip.title}
              fill
              sizes={imageSizes}
              preload={priority}
              quality={imageQuality}
              className="object-cover object-right-bottom transition-transform duration-[1100ms] ease-[var(--ease-trail)] group-hover:scale-[1.03]"
            />
          ) : null}
          {off ? <span className="bg-crimson absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.68rem] font-bold text-white">{off}% Off</span> : null}
          {tag ? (
            <span className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-[0.62rem] font-bold tracking-[0.08em] text-[#242a2c] uppercase shadow-sm">
              {tag}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 text-[0.64rem] font-bold tracking-[0.12em] text-muted uppercase">
            <span className="truncate">{regionName ?? "Nepal"}</span>
            <span className="shrink-0">{trip.days} {trip.days === 1 ? "day" : "days"}</span>
          </div>
          <h3 className="font-display mt-2 line-clamp-2 text-[1.12rem] leading-snug tracking-[-0.03em] text-ink transition-colors group-hover:text-pine">
            {trip.title}
          </h3>
          {trip.rating ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted">
              <Star className="fill-marigold text-marigold size-3.5" aria-hidden /> {trip.rating.value.toFixed(1)} · {trip.rating.count} {trip.rating.count === 1 ? "review" : "reviews"}
            </p>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            {trip.price ? (
              <div className="leading-tight">
                <p className="text-[0.7rem] text-muted">
                  From {trip.price.regular ? <span className="ml-1 line-through">{usd(trip.price.regular)}</span> : null}
                </p>
                <p className="font-display text-[1.45rem] text-ink">
                  <span className="mr-0.5 text-[0.75rem] font-semibold text-muted">US$</span>
                  {trip.price.amount.toLocaleString("en-US")}
                </p>
              </div>
            ) : (
              <p className="text-[0.78rem] text-muted">Plan with our local team</p>
            )}
            <span className="text-pine border-b-2 border-pine/40 pb-0.5 text-[0.8rem] font-bold transition-colors group-hover:border-pine">Explore trip</span>
          </div>
        </div>

        {tilt ? <motion.span aria-hidden style={{ backgroundImage: glare }} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" /> : null}
      </Link>
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[3/2]">
        <CardActions slug={trip.slug} title={trip.title} className="pointer-events-auto absolute right-3 bottom-3" />
      </div>
    </motion.article>
  );
}
