"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Play, Pause, X } from "lucide-react";
import Image from "@/components/image";
import { VideoMark } from "@/components/brand/video-mark";
import { usePageWheelScroll } from "@/lib/use-page-wheel-scroll";

export type VideoReview = { id: string; title: string; src: string; poster?: string };

export function VideoReviewGallery({ items }: { items: VideoReview[] }) {
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);
  const [selected, setSelected] = useState<VideoReview | null>(null);
  const [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(true);
  const isOpen = selected !== null;

  useEffect(() => {
    if (!isOpen) return;
    const modal = dialog.current;
    const video = player.current;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    modal?.showModal();
    html.style.overflow = "hidden";
    return () => {
      video?.pause();
      modal?.close();
      html.style.overflow = previousOverflow;
      opener.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  usePageWheelScroll(track, items.length);

  const close = () => { player.current?.pause(); setSelected(null); };
  const switchVideo = (step: number) => {
    player.current?.pause();
    setPaused(true);
    setSelected((current) => {
      const index = items.findIndex((item) => item.id === current?.id);
      return items[(index + step + items.length) % items.length];
    });
  };
  const togglePlayback = () => {
    const video = player.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setPaused(true));
    else video.pause();
  };
  const go = (step: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: step * ((card?.offsetWidth ?? 280) + 16), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  if (!items.length) return null;

  return <div className="min-w-0" role="region" aria-label="Traveller video reviews" aria-roledescription="carousel">
    <div
      ref={track}
      tabIndex={0}
      aria-label="Video stories. Swipe or use the arrow keys to browse."
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); go(event.key === "ArrowRight" ? 1 : -1); }
      }}
      onScroll={() => {
        const el = track.current;
        const card = el?.firstElementChild as HTMLElement | null;
        if (el && card) setPosition(Math.round(el.scrollLeft / (card.offsetWidth + 16)));
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        drag.current = { x: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false };
      }}
      onPointerMove={(event) => {
        const state = drag.current;
        if (!state) return;
        const distance = event.clientX - state.x;
        if (Math.abs(distance) > 6 && !state.moved) {
          state.moved = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.style.scrollSnapType = "none";
        }
        if (state.moved) event.currentTarget.scrollLeft = state.scroll - distance;
      }}
      onPointerUp={(event) => { event.currentTarget.style.scrollSnapType = ""; }}
      onPointerCancel={(event) => { drag.current = null; event.currentTarget.style.scrollSnapType = ""; }}
      onPointerLeave={() => { if (!drag.current?.moved) drag.current = null; }}
      onClickCapture={(event) => {
        if (drag.current?.moved) { event.preventDefault(); event.stopPropagation(); }
        drag.current = null;
      }}
      className="no-scrollbar flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain overscroll-y-auto rounded-xl pb-3 select-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine"
    >
      {items.map((item, index) => <article key={item.id} className="w-[72%] shrink-0 snap-start sm:w-[calc((100%_-_2rem)/3)] lg:w-[calc((100%_-_4rem)/5)]">
        <button type="button" onClick={(event) => { opener.current = event.currentTarget; setSelected(item); }} aria-label={`Open video: ${item.title}`} className="group block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine">
          <span className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-pine/10">
            {item.poster ? <Image src={item.poster} alt="" fill sizes="(max-width: 640px) 72vw, (max-width: 1024px) 33vw, 20vw" draggable={false} className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" /> : <video src={item.src} preload="metadata" playsInline muted className="pointer-events-none h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <VideoMark size="sm" />
          </span>
          <span className="mt-3 block line-clamp-2 text-sm font-semibold leading-snug">{item.title}</span>
          <span className="mt-1 block text-xs text-muted">Traveller story · {String(index + 1).padStart(2, "0")}</span>
        </button>
      </article>)}
    </div>
    {items.length > 1 && <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-xs text-muted">Swipe to explore more stories</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => go(-1)} disabled={position === 0} aria-label="Previous video stories" className="grid size-10 place-items-center rounded-full border border-line text-pine hover:bg-pine/5 disabled:opacity-30"><ArrowLeft className="size-4" /></button>
        <button type="button" onClick={() => go(1)} aria-label="Next video stories" className="grid size-10 place-items-center rounded-full border border-line text-pine hover:bg-pine/5"><ArrowRight className="size-4" /></button>
      </div>
    </div>}
    {selected && <dialog ref={dialog} aria-label={selected.title} onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { if (!dialog.current?.open) close(); }} onKeyDown={(event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); switchVideo(event.key === "ArrowRight" ? 1 : -1); }
    }} onClick={(event) => { if (event.target === event.currentTarget) close(); }} data-lenis-prevent className="video-review-dialog fixed inset-0 m-auto h-dvh max-h-none w-screen max-w-none bg-transparent p-4 text-white outline-none open:flex open:items-center open:justify-center sm:p-6">
      <div className="relative flex max-h-full max-w-full flex-col items-center">
        <button type="button" autoFocus onClick={close} aria-label="Close video" className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-black/65 text-white hover:bg-black"><X className="size-5" /></button>
        <div className="relative max-w-full">
          <video ref={player} key={selected.id} src={selected.src} poster={selected.poster} autoPlay playsInline preload="metadata" onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onEnded={() => setPaused(true)} className="max-h-[calc(100dvh-7rem)] max-w-full rounded-2xl bg-black object-contain shadow-2xl" />
          <VideoMark size="lg" className="overflow-hidden rounded-2xl" />
          <button type="button" onClick={togglePlayback} aria-label={paused ? "Play video" : "Pause video"} className="group absolute inset-0 flex items-center justify-center rounded-2xl focus-visible:outline-2 focus-visible:outline-white">
            <span className={`grid size-12 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-opacity ${paused ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
              {paused ? <Play className="ml-0.5 size-5 fill-current" aria-hidden /> : <Pause className="size-5 fill-current" aria-hidden />}
            </span>
          </button>
          {items.length > 1 && <>
            <button type="button" onClick={() => switchVideo(-1)} aria-label="Previous video" className="absolute top-1/2 left-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/20 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/45 hover:text-white sm:-left-12"><ChevronLeft className="size-5" aria-hidden /></button>
            <button type="button" onClick={() => switchVideo(1)} aria-label="Next video" className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/20 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/45 hover:text-white sm:-right-12"><ChevronRight className="size-5" aria-hidden /></button>
          </>}
        </div>
        <p className="mt-3 max-w-lg text-center text-sm font-medium">{selected.title}</p>
      </div>
    </dialog>}
  </div>;
}
