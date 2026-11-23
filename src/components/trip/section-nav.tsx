"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useScroll, useSpring } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { openTripModal } from "@/components/trip/trip-modals";
import { pinnedOffset, scrollToId } from "@/lib/scroll";
import type { Price } from "@/lib/types";
import { cn, usd } from "@/lib/utils";

/**
 * The trip page's section bar.
 *
 * Pinned under the header for the whole page. The active tab follows the
 * section being read (and centres itself on phones), a thin line shows how far
 * down the trip you are, and once the bar is pinned a compact price and
 * booking button slide in on desktop.
 */
export function SectionNav({
  items,
  price,
}: {
  items: { id: string; label: string }[];
  price: Price | null;
}) {
  const [active, setActive] = useState(items[0]?.id);
  const [stuck, setStuck] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lockUntil = useRef(0);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });

  // Which section is under the bar right now.
  useEffect(() => {
    const onScroll = () => {
      const nav = navRef.current;
      if (nav) setStuck(nav.getBoundingClientRect().top <= (parseFloat(getComputedStyle(nav).top) || 0) + 1);
      if (Date.now() < lockUntil.current) return;
      const line = pinnedOffset(24);
      let current = items[0]?.id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= line) current = it.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  // Keep the active tab in view on narrow screens.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const tab = scroller?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!scroller || !tab) return;
    scroller.scrollTo({ left: tab.offsetLeft - scroller.clientWidth / 2 + tab.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  return (
    <div ref={navRef} data-subnav className="sticky top-[4.5rem] z-30 mx-auto max-w-site px-4 sm:px-6 lg:top-[5.25rem]">
      <nav
        aria-label="Trip sections"
        className={cn(
          "relative flex w-full max-w-full items-center lg:w-[calc(100%_-_27rem)] xl:ml-[clamp(2rem,4.7vw,6rem)] xl:w-[calc(100%_-_27rem_-_clamp(4rem,9.4vw,12rem))] gap-2 overflow-hidden rounded-2xl border p-1.5 backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-500",
          stuck ? "border-line bg-card/95 shadow-[0_14px_40px_-22px_oklch(0.2_0.04_170/0.45)]" : "border-line/70 bg-card/80",
        )}
      >
        <div ref={scrollerRef} className="no-scrollbar flex min-w-0 flex-1 justify-between gap-1 overflow-x-auto scroll-smooth">
          {items.map((i) => {
            const on = active === i.id;
            return (
              <a
                key={i.id}
                data-tab={i.id}
                href={`#${i.id}`}
                aria-current={on ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setActive(i.id);
                  // Hold the highlight on the chosen tab while the page glides there.
                  lockUntil.current = Date.now() + 1300;
                  scrollToId(i.id);
                }}
                className={cn(
                  "relative shrink-0 grow rounded-xl text-center px-3.5 py-2.5 text-sm font-semibold transition-colors sm:px-4",
                  on ? "text-white" : "text-ink-soft hover:bg-snow-2 hover:text-ink",
                )}
              >
                {on ? (
                  <m.span layoutId="trip-tab-pill" className="bg-pine absolute inset-0 rounded-xl" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                ) : null}
                <span className="relative">{i.label}</span>
              </a>
            );
          })}
        </div>

        <AnimatePresence>
          {stuck ? (
            <m.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="hidden shrink-0 items-center gap-3 border-l border-line pl-3 lg:flex"
            >
              {price ? (
                <span className="text-right leading-tight">
                  <span className="block text-[0.68rem] font-semibold tracking-wide text-muted uppercase">From</span>
                  <span className="font-display block text-2xl font-black">{usd(price.amount)}</span>
                </span>
              ) : null}
              <button type="button" onClick={() => openTripModal(price ? "book" : "enquire")} className="bg-marigold text-pine-night hover:bg-pine inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors hover:text-white">
                {price ? "Book Now" : "Send Us A Message"} <ArrowRight className="size-4" aria-hidden />
              </button>
            </m.div>
          ) : null}
        </AnimatePresence>

        <m.span aria-hidden className="bg-marigold absolute inset-x-0 bottom-0 h-[2.5px] origin-left" style={{ scaleX: progress }} />
      </nav>
    </div>
  );
}
