"use client";

import Image from "@/components/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { PhotoGlow } from "@/components/photo-glow";
import { Portal } from "@/components/portal";
import { cn } from "@/lib/utils";

export type GalleryPhoto = { src: string; w: number; h: number; alt: string; trip: string; tripTitle: string; region: string };

const STEP = 36;

/**
 * The company's photographs from every trip, filterable by region, in a
 * masonry layout with a full-screen viewer. Each photo links to its trip.
 */
export function GalleryGrid({ photos, regions }: { photos: GalleryPhoto[]; regions: { slug: string; name: string; count: number }[] }) {
  const [region, setRegion] = useState("");
  const [limit, setLimit] = useState(STEP);
  const [index, setIndex] = useState<number | null>(null);

  const list = useMemo(() => (region ? photos.filter((p) => p.region === region) : photos), [photos, region]);
  const shown = list.slice(0, limit);

  const go = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + list.length) % list.length)), [list.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [index, go]);

  const current = index !== null ? list[index] : null;

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by region">
        {[{ slug: "", name: "All photos", count: photos.length }, ...regions].map((r) => (
          <button
            key={r.slug || "all"}
            type="button"
            aria-pressed={region === r.slug}
            onClick={() => {
              setRegion(r.slug);
              setLimit(STEP);
            }}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              region === r.slug ? "bg-pine text-white" : "border border-line bg-card text-ink-soft hover:border-pine hover:text-ink",
            )}
          >
            {r.name} <span className="font-mono text-xs opacity-60">{r.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4 [&>*]:mb-3 sm:[&>*]:mb-4">
        {shown.map((p, i) => (
          <m.button
            key={p.src}
            type="button"
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: (i % STEP) * 0.015 }}
            onClick={() => setIndex(i)}
            className="group relative block w-full break-inside-avoid"
            aria-label={`Open photo: ${p.alt || p.tripTitle}`}
          >
            <PhotoGlow src={p.src} strength="sm" />
            <span className="relative block overflow-hidden rounded-2xl bg-snow-2">
              <Image
                src={p.src}
                alt={p.alt || p.tripTitle}
                width={p.w}
                height={p.h}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                quality={75}
                className="h-auto w-full transition-transform duration-700 group-hover:scale-105"
              />
              <span className="scrim-b absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="absolute bottom-3 left-3 right-[30%] translate-y-2 text-left text-xs font-semibold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                {p.tripTitle}
              </span>
            </span>
          </m.button>
        ))}
      </div>

      {limit < list.length ? (
        <div className="mt-10 flex justify-center">
          <button type="button" onClick={() => setLimit((l) => l + STEP)} className="bg-ink text-snow rounded-full px-8 py-4 font-bold transition-colors hover:bg-pine">
            Show more photos <span className="font-mono text-sm opacity-60">{list.length - limit}</span>
          </button>
        </div>
      ) : null}

      <Portal>
        <AnimatePresence>
          {current && index !== null ? (
            <m.div
              data-lenis-prevent
              role="dialog"
              aria-modal="true"
              aria-label="Photo viewer"
              className="fixed inset-0 z-[200] flex flex-col bg-pine-night/95 text-white backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
                <Link href={`/trip/${current.trip}/`} className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold hover:text-marigold">
                  <span className="truncate">{current.tripTitle}</span> <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm text-white/70">{index + 1} / {list.length}</span>
                  <button type="button" onClick={() => setIndex(null)} aria-label="Close photos" className="grid size-12 place-items-center rounded-full bg-white/15 hover:bg-white/25">
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="relative flex-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  <m.div
                    key={current.src}
                    className="absolute inset-0 px-4 sm:px-20"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -60) go(1);
                      if (info.offset.x > 60) go(-1);
                    }}
                  >
                    <Image src={current.src} alt={current.alt || current.tripTitle} fill sizes="100vw" quality={85} className="object-contain" />
                  </m.div>
                </AnimatePresence>
                <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute top-1/2 left-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:left-6">
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute top-1/2 right-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:right-6">
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </div>
              <p className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-white/70">{current.alt}</p>
            </m.div>
          ) : null}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
