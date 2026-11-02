"use client";

import Image from "@/components/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cropFor } from "@/lib/banner";
import { GalleryButton } from "@/components/trip/gallery";
import { openTripModal } from "@/components/trip/trip-modals";
import type { Img } from "@/lib/types";
import { useChromeLang } from "@/components/site/tr";
import { word } from "@/lib/chrome-words";

/** The prototype's trip photograph slider: arrows, swipe, and the full set in a viewer. */
export function TripSlider({ images, title }: { images: Img[]; title: string }) {
  const [i, setI] = useState(0);
  const lang = useChromeLang();
  if (!images.length) return null;
  const go = (d: number) => setI((n) => (n + d + images.length) % images.length);
  const img = images[i];
  // One logo per view: the photo's own, or an overlay where the crop hides it.
  const crops = [cropFor(img.w, img.h, 4 / 3), cropFor(img.w, img.h, 3 / 2), cropFor(img.w, img.h, 21 / 9)];

  return (
    <div className="relative isolate overflow-hidden rounded-xl bg-snow-2">
      <div
        className="relative aspect-[4/3] sm:aspect-[3/2] lg:aspect-[21/9]"
        style={{ ["--pos-m" as string]: crops[0].position, ["--pos-s" as string]: crops[1].position, ["--pos-l" as string]: crops[2].position }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={img.src}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) go(1);
              if (info.offset.x > 50) go(-1);
            }}
          >
            <Image src={img.src} alt={img.alt || `${title} photograph ${i + 1}`} fill preload={i === 0} fetchPriority={i === 0 ? "high" : "auto"} quality={80} sizes="(max-width: 1440px) 100vw, 1376px" className="object-cover object-[var(--pos-m)] sm:object-[var(--pos-s)] lg:object-[var(--pos-l)]" />
          </motion.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
      </div>

      {images.length > 1 ? (
        <>
          <button type="button" onClick={() => go(-1)} aria-label={word(lang, "Previous photo")} className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#242a2c] shadow-md transition hover:bg-white sm:left-5">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" onClick={() => go(1)} aria-label={word(lang, "Next photo")} className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#242a2c] shadow-md transition hover:bg-white sm:right-5">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </>
      ) : null}

      {/* Controls stay clear of the bottom-right corner, where the logo sits. */}
      <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5">
        <GalleryButton images={images} title={title} />
      </div>
      <span className="absolute top-3 right-3 rounded-full bg-black/45 px-3 py-1.5 font-mono text-xs text-white backdrop-blur sm:top-5 sm:right-5">
        {i + 1} / {images.length}
      </span>
    </div>
  );
}

/** "Plan this trip": books when the trip has a price, otherwise opens the enquiry. */
export function PlanTripButton({ priced }: { priced: boolean }) {
  return (
    <button
      type="button"
      onClick={() => openTripModal(priced ? "book" : "enquire")}
      className="bg-pine hover:bg-pine-deep inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white transition-colors"
    >
      {priced ? "Book now" : "Plan this trip"} <ArrowRight className="size-4" aria-hidden />
    </button>
  );
}
