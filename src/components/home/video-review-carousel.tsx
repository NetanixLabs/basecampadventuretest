"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { VideoMark } from "@/components/brand/video-mark";

export type VideoReview = { id: string; title: string; src: string; poster?: string };

export function VideoReviewCarousel({ items }: { items: VideoReview[] }) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const reduce = useReducedMotion();
  const go = (offset: number) => setActive((index) => (index + offset + items.length) % items.length);
  if (!items.length) return null;
  return <div ref={ref} role="region" aria-roledescription="carousel" aria-label="Traveller video reviews" tabIndex={0} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "ArrowRight") { event.preventDefault(); go(1); } if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); } }} className="outline-none [container-type:inline-size]">
    <motion.div className="relative mx-auto h-[min(145vw,42rem)] sm:h-[42rem] lg:[--review-step:21cqw] [--review-step:90%] [perspective:1400px]" onPanEnd={(_, info) => { if (info.offset.x < -50) go(1); else if (info.offset.x > 50) go(-1); }}>
      {items.map((item, index) => {
        let offset = index - active;
        if (offset > items.length / 2) offset -= items.length;
        if (offset < -items.length / 2) offset += items.length;
        const distance = Math.abs(offset);
        const selected = offset === 0;
        return <motion.div key={item.id} aria-hidden={!selected} initial={false} animate={{ x: reduce ? "-50%" : `calc(-50% + ${offset} * var(--review-step))`, rotateY: offset * -7, rotateZ: offset * 0.25, scale: reduce ? 1 : 1 - Math.min(distance, 2) * 0.08, opacity: distance > 2 || (reduce && !selected) ? 0 : selected ? 1 : 1 - distance * 0.25, z: reduce ? 0 : -distance * 30 }} transition={{ type: "spring", stiffness: 160, damping: 24 }} style={{ left: "50%", transformPerspective: 1100, zIndex: 10 - distance, transformStyle: "preserve-3d", pointerEvents: distance > 2 ? "none" : "auto" }} className="video-review-slide absolute top-0 left-1/2 h-full aspect-[9/16] overflow-hidden rounded-2xl bg-black shadow-[0_25px_60px_-25px_rgba(0,70,80,0.4)]">
          <AutoplayReview item={item} active={selected && inView} />
          {!selected ? <button type="button" tabIndex={-1} onClick={() => go(offset)} aria-label={`Watch ${item.title}`} className="absolute inset-0 cursor-pointer" /> : null}
        </motion.div>;
      })}
    </motion.div>
    {items.length > 1 ? <div className="mt-5 flex items-center justify-center gap-4"><button type="button" onClick={() => go(-1)} aria-label="Previous video review" className="grid size-10 place-items-center rounded-full border border-line bg-card text-pine"><ArrowLeft className="size-5" /></button><span className="text-xs text-muted" aria-live="polite">{active + 1} / {items.length}</span><button type="button" onClick={() => go(1)} aria-label="Next video review" className="grid size-10 place-items-center rounded-full border border-line bg-card text-pine"><ArrowRight className="size-5" /></button></div> : null}
  </div>;
}

function AutoplayReview({ item, active }: { item: VideoReview; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const manuallyPaused = useRef(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const sync = () => { if (active && !document.hidden) { video.muted = false; if (!manuallyPaused.current) void video.play().catch(() => setPaused(true)); } else video.pause(); };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { document.removeEventListener("visibilitychange", sync); video.pause(); };
  }, [active]);
  const toggle = () => {
    const video = ref.current;
    if (!video || !active) return;
    if (video.paused) { manuallyPaused.current = false; video.muted = false; void video.play().catch(() => setPaused(true)); }
    else { manuallyPaused.current = true; video.pause(); }
  };
  return <><video ref={ref} src={item.src} poster={item.poster} autoPlay={active} loop playsInline disablePictureInPicture onPlay={() => setPaused(false)} onPause={() => setPaused(true)} preload="metadata" tabIndex={-1} aria-label={item.title} className="h-full w-full object-contain" /><VideoMark size="lg" /><button type="button" onClick={toggle} tabIndex={active ? 0 : -1} aria-label={`${paused ? "Resume" : "Pause"} ${item.title}`} className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white" /></>;
}
