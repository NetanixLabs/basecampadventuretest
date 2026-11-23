"use client";

import { Fragment, useSyncExternalStore } from "react";
import { preload } from "react-dom";
import { headingParts, type HomeCopy } from "@/lib/home-copy";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Mountain } from "lucide-react";
import { EASE } from "@/components/motion";
import { openSearch } from "@/components/site/search";
import { Search } from "lucide-react";

/** Up to this width the hero uses the phone versions of the video and poster. */
const PHONE_MAX = 639;
const PHONE_QUERY = `(max-width: ${PHONE_MAX}px)`;

export function HomeHero({ copy }: { copy: HomeCopy["hero"] }) {
  const lines = headingParts(copy.heading);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [warmNext, setWarmNext] = useState(false);
  const reduce = useReducedMotion();
  const [activeClip, setActiveClip] = useState(0);
  // Phones show only the middle of the wide video, so they get versions cut to just that part (6x smaller).
  const phone = useSyncExternalStore(
    (onChange) => { const m = window.matchMedia(PHONE_QUERY); m.addEventListener("change", onChange); return () => m.removeEventListener("change", onChange); },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
  const clips = phone ? ["/videos/home-hero-mobile.mp4", "/videos/home-hero-second-mobile.mp4"] : ["/videos/home-hero.mp4", "/videos/home-hero-second.mp4"];
  const posters = phone ? ["/videos/home-hero-mobile-poster.webp", "/videos/home-hero-second-mobile-poster.webp"] : ["/videos/home-hero-poster.webp", "/videos/home-hero-second-poster.webp"];
  // The poster shows at once (it's the first thing people see); the video
  // itself starts downloading only after the page has finished loading, so it
  // never competes with the page for bandwidth on a phone.
  preload("/videos/home-hero-poster.webp", { as: "image", fetchPriority: "high", media: `(min-width: ${PHONE_MAX + 1}px)` });
  preload("/videos/home-hero-mobile-poster.webp", { as: "image", fetchPriority: "high", media: `(max-width: ${PHONE_MAX}px)` });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Data saver or a slow connection: keep the still photo, skip the video.
    const net = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (net?.saveData || /(^|-)(2g|3g)$/.test(net?.effectiveType ?? "")) return;
    const start = () => {
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) idle(() => setReady(true), { timeout: 2500 });
      else window.setTimeout(() => setReady(true), 1200);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  useEffect(() => {
    let inView = true;
    const update = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    if (heroRef.current) observer.observe(heroRef.current);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  const entrance = (delay: number) => ({
    // Opacity and movement only: an animated blur is costly to paint on phones.
    initial: reduce ? false as const : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.85, delay: reduce ? 0 : delay, ease: EASE },
  });

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (!ready || index !== activeClip || reduce || !visible) video.pause();
      else void video.play().catch(() => {});
    });
  }, [activeClip, reduce, visible, ready]);


  const nextClip = () => {
    const next = (activeClip + 1) % clips.length;
    const video = videoRefs.current[next];
    if (video) video.currentTime = 0;
    setActiveClip(next);
  };

  return (
    <section aria-label="Discover Nepal with Base Camp Adventure" className="px-4 pt-20 sm:px-6 lg:pt-[5.75rem]">
      <div ref={heroRef} className="relative isolate mx-auto grid max-w-site overflow-hidden rounded-[1.5rem] bg-[#142e34] lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
        {/* The poster as a plain image paints with the HTML, before any script runs. */}
        <picture>
          <source media={`(max-width: ${PHONE_MAX}px)`} type="image/webp" srcSet="/videos/home-hero-mobile-poster.webp" />
          <source media={`(max-width: ${PHONE_MAX}px)`} srcSet="/videos/home-hero-mobile-poster.jpg" />
          <source type="image/webp" srcSet="/videos/home-hero-poster.webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/videos/home-hero-poster.jpg" alt="" aria-hidden fetchPriority="high" decoding="async" className="pointer-events-none absolute inset-0 -z-30 h-full w-full object-cover object-center" />
        </picture>
        {clips.map((src, index) => (
          <video key={src} ref={(video) => { videoRefs.current[index] = video; }} src={ready ? src : undefined} poster={!ready ? undefined : index === 0 ? posters[0] : warmNext || activeClip === index ? posters[1] : undefined} muted playsInline preload={ready && (index === activeClip || warmNext) ? "auto" : "none"} onTimeUpdate={(event) => { const video = event.currentTarget; if (index === activeClip && video.duration - video.currentTime < 6) setWarmNext(true); }} onEnded={nextClip} className={`pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center transition-opacity duration-1000 motion-reduce:transition-none ${index === activeClip ? "opacity-100" : "opacity-0"}`} aria-hidden />
        ))}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#071a20]/90 via-[#071a20]/10 to-[#071a20]/20" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#071a20]/85 via-transparent to-transparent" />
        <aside className="order-2 flex flex-col justify-between border-t border-white/20 p-6 text-white lg:order-1 lg:border-t-0 lg:border-r lg:p-7">
          <m.div {...entrance(0.15)}>
            <p className="text-[0.65rem] font-bold tracking-[0.2em] text-white/65 uppercase">Kathmandu, Nepal · Est. 2009</p>
            <div className="mt-6 flex items-center gap-3 lg:mt-10">
              <Mountain className="size-8 text-white/80" aria-hidden />
              <p className="text-xl leading-tight font-bold">Big mountains.<br />Local knowledge.</p>
            </div>
          </m.div>
          <m.div {...entrance(0.45)} className="mt-8 lg:mt-16">
            <p className="max-w-xs text-sm leading-relaxed text-white/80">Trekking &amp; tours with the people who call Nepal home. Discover the Himalayas with our experienced local team.</p>
            <Link href="/about-us/" className="mt-5 inline-flex items-center gap-2 border-b border-white/35 pb-1 text-sm font-semibold transition-colors hover:text-white/75">Meet your local guides <ArrowUpRight className="size-4" aria-hidden /></Link>
          </m.div>
          <m.div {...entrance(0.75)} className="mt-8 grid gap-3 lg:mt-16">
            <Link href="/customize-trip/" className="group flex items-center justify-between gap-3 rounded-full bg-white px-5 py-3.5 text-sm font-bold text-pine-deep transition-colors hover:bg-white/90">Plan your adventure <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden /></Link>
            <p className="text-center text-[0.65rem] tracking-wider text-white/60">Small groups. Personal journeys.</p>
          </m.div>
        </aside>
        <div className="relative order-1 min-h-[34rem] lg:order-2 lg:h-[calc(100svh-7rem)] lg:min-h-[38rem] lg:max-h-[62rem]">
          <div className="relative flex h-full min-h-[34rem] flex-col justify-between p-6 sm:p-9 lg:min-h-0 lg:p-10 xl:p-12">
            <m.div {...entrance(0.2)} className="flex items-center justify-between gap-4">
              <span className="rounded-full border border-white/35 bg-black/10 px-4 py-2 text-[0.65rem] font-semibold tracking-[0.16em] text-white backdrop-blur-sm uppercase">Your Himalayan journey</span>
              <button type="button" onClick={openSearch} aria-label="Search trips and destinations" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:px-4">
                <Search className="size-4" aria-hidden /><span className="hidden sm:inline">Search</span><kbd className="hidden rounded border border-white/30 px-1.5 text-[0.65rem] font-normal text-white/80 lg:inline">Ctrl K</kbd>
              </button>
            </m.div>
            <div className="mt-36 text-white">
              <m.p {...entrance(0.35)} className="mb-4 text-xs font-semibold tracking-[0.2em] text-white/80 uppercase">{copy.eyebrow}</m.p>
              <h1 className="max-w-3xl font-display text-[clamp(3rem,5.8vw,7rem)] leading-[0.98] font-bold tracking-[-0.055em]">
                {lines.map((parts, i) => (
                  <m.span key={i} {...entrance(0.5 + i * 0.2)} className="block">
                    {parts.map((p, j) => (p.accent ? <span key={j} className="font-serif italic font-normal tracking-[-0.04em]">{p.text}</span> : <Fragment key={j}>{p.text}</Fragment>))}
                  </m.span>
                ))}
              </h1>
              <m.div {...entrance(0.95)} className="mt-7 flex flex-col gap-5 border-t border-white/25 pt-6 sm:flex-row sm:items-end sm:justify-between">
                <p className="max-w-xs text-sm leading-relaxed text-white/85">{copy.text.split("\n").map((l, i) => <Fragment key={i}>{i ? <br /> : null}{l}</Fragment>)}</p>
                <Link href="/trip/" className="group inline-flex items-center gap-4 self-start rounded-full bg-white px-5 py-3.5 text-sm font-bold text-pine-deep sm:self-auto">{copy.button} <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden /></Link>
              </m.div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-4 px-1 py-5 text-xs text-muted">
        <p>Experienced local guides <span className="mx-2 text-line">/</span> Trips made around you</p>
        <Link href="#find" className="inline-flex items-center gap-2 font-semibold text-pine">Find your next adventure <ArrowDown className="size-4" aria-hidden /></Link>
      </div>
    </section>
  );
}

