"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  m,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Rises into place as it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduce = useReducedMotion();
  const Tag = m[as];
  return (
    <Tag
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={className}
    >
      {children}
    </Tag>
  );
}

/** Children reveal one after another. Pair with <StaggerItem>. */
export function Stagger({ children, className, gap = 0.07 }: { children: React.ReactNode; className?: string; gap?: number }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, className, ...rest }: { children: React.ReactNode; className?: string } & HTMLMotionProps<"div">) {
  return (
    <m.div
      variants={{
        hidden: { opacity: 0, y: 36, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: EASE } },
      }}
      className={className}
      {...rest}
    >
      {children}
    </m.div>
  );
}

/**
 * Headline that wipes up from behind its own baseline, a line at a time.
 * The trigger is the unclipped heading, never a masked line, or the line
 * would never count as visible and never animate.
 */
export function LineReveal({
  lines,
  className,
  delay = 0,
  as = "h2",
  immediate = false,
}: {
  lines: React.ReactNode[];
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "p" | "span";
  immediate?: boolean;
}) {
  const reduce = useReducedMotion();
  // A page's opening headline rises in with CSS alone, so it paints before any script runs.
  if (immediate) {
    const Plain = as;
    return (
      <Plain className={className}>
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-[0.06em]">
            <span className="line-rise block" style={{ animationDelay: `${delay + i * 0.09}s` }}>
              {line}
            </span>
          </span>
        ))}
      </Plain>
    );
  }
  const Tag = m[as];
  const trigger = { whileInView: "show", viewport: { once: true, margin: "-10%" } };
  return (
    <Tag
      className={className}
      initial={reduce ? false : "hidden"}
      {...trigger}
      variants={{ hidden: {}, show: { transition: { delayChildren: delay, staggerChildren: 0.09 } } }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.06em]">
          <m.span
            className="block"
            variants={{ hidden: { y: "110%", rotate: 2 }, show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } } }}
          >
            {line}
          </m.span>
        </span>
      ))}
    </Tag>
  );
}

/** A photograph that drifts against the scroll, for depth. */
const wideQuery = (min: number) => `(min-width: ${min}px)`;

/** Drifts its photograph against the scroll. `minWidth` keeps it still on smaller screens. */
export function Parallax({ children, className, amount = 14, minWidth = 0 }: { children: React.ReactNode; className?: string; amount?: number; minWidth?: number }) {
  const wide = useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(wideQuery(minWidth));
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(wideQuery(minWidth)).matches,
    () => minWidth === 0,
  );
  const reduce = useReducedMotion() || !wide;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${amount}%`, `${amount}%`]);
  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <m.div className="absolute inset-0" style={reduce ? undefined : { y, scale: 1 + (amount * 2) / 100 }}>
        {children}
      </m.div>
    </div>
  );
}

/** Counts up once when it scrolls into view; the last frame is always exact. */
export function CountUp({ to, suffix = "", prefix = "", className, duration = 1400 }: { to: number; suffix?: string; prefix?: string; className?: string; duration?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  // The real number is what the server renders: search engines, screen readers
  // and visitors without JavaScript never see a zero.
  const [n, setN] = useState(to);

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round(to * (1 - (1 - p) ** 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className={cn("tnum", className)}>
      {prefix}
      {n.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/** Leans toward the pointer: for the one primary button per screen. */
export function Magnetic({ children, strength = 0.28, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={cn("inline-block", className)}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.div>
  );
}

/** Thin progress bar along the top of long reads. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return <m.div aria-hidden className="bg-marigold fixed inset-x-0 top-0 z-[60] h-[3px] origin-left" style={{ scaleX }} />;
}
