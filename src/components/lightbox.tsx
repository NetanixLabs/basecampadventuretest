"use client";

import Image from "@/components/image";
import { useCallback, useEffect } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Portal } from "@/components/portal";

export type LightboxImage = { src: string; w?: number; h?: number; alt: string; caption?: string | null };

/**
 * Full-screen photo viewer: the whole photograph, never cropped, with arrows,
 * swipe, thumbnails, arrow keys and Escape. `index === null` means closed.
 */
export function Lightbox({ images, index, onIndex, title }: { images: LightboxImage[]; index: number | null; onIndex: (i: number | null) => void; title: string }) {
  const open = index !== null && images.length > 0;
  const go = useCallback((d: number) => index !== null && onIndex((index + d + images.length) % images.length), [index, images.length, onIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndex(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, go, onIndex]);

  const current = open ? images[index] : null;

  return (
    <Portal>
      <AnimatePresence>
        {current && index !== null ? (
          <m.div
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label={`${title} photographs`}
            className="fixed inset-0 z-[200] flex flex-col bg-[#0b1012]/95 text-white backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
              <p className="min-w-0 truncate text-sm text-white/70">
                <span className="font-mono">
                  {index + 1} / {images.length}
                </span>
                {current.caption ? <span className="ml-3">{current.caption}</span> : null}
              </p>
              <button type="button" onClick={() => onIndex(null)} aria-label="Close photos" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.div
                  key={current.src}
                  className="absolute inset-0 px-3 sm:px-20"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  drag={images.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) go(1);
                    if (info.offset.x > 60) go(-1);
                  }}
                >
                  <Image src={current.src} alt={current.alt || title} fill sizes="100vw" quality={85} className="object-contain" />
                </m.div>
              </AnimatePresence>
              {images.length > 1 ? (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:left-6 sm:size-12">
                    <ChevronLeft className="size-6" aria-hidden />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:right-6 sm:size-12">
                    <ChevronRight className="size-6" aria-hidden />
                  </button>
                </>
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="no-scrollbar flex gap-2 overflow-x-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-center sm:p-6">
                {images.map((img, i) => (
                  <button key={img.src + i} type="button" onClick={() => onIndex(i)} aria-label={`Photo ${i + 1}`} className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg transition sm:h-14 sm:w-20 ${i === index ? "ring-2 ring-[#3ccbdc]" : "opacity-50 hover:opacity-100"}`}>
                    <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </m.div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
