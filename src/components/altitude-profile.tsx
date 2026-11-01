"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { placeOf } from "@/lib/itinerary";
import { cn } from "@/lib/utils";

export { placeOf };

export type ProfileDay = { day: number; title: string; altitude: number | null };

/** Fills days without a recorded altitude from their neighbours. */
function fill(days: ProfileDay[]) {
  const vals = days.map((d) => d.altitude);
  return vals.map((v, i) => {
    if (v) return v;
    let a = i - 1;
    while (a >= 0 && !vals[a]) a--;
    let b = i + 1;
    while (b < vals.length && !vals[b]) b++;
    const left = a >= 0 ? (vals[a] as number) : null;
    const right = b < vals.length ? (vals[b] as number) : null;
    if (left && right) return Math.round(left + ((right - left) * (i - a)) / (b - a));
    return left ?? right ?? 1400;
  });
}

/**
 * Altitude profile drawn from the itinerary.
 *
 * The drawing is laid out at the width it is actually shown at (measured with
 * a ResizeObserver), so on a phone it fits the screen with readable labels
 * instead of being squeezed or cut off.
 */
export type ProfileWords = { highest: string; day: string; tap: string };
const EN_WORDS: ProfileWords = { highest: "Highest", day: "day", tap: "Tap a day to see where you sleep." };

export function AltitudeProfile({ days, tone = "dark", className, words = EN_WORDS }: { days: ProfileDay[]; tone?: "dark" | "light"; className?: string; words?: ProfileWords }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const [hover, setHover] = useState<number | null>(null);
  const unit = "m" as "m" | "ft";
  const [W, setW] = useState(1000);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(300, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const compact = W < 560;
  const H = compact ? 280 : 360;
  const PAD = compact ? { l: 34, r: 14, t: 52, b: 40 } : { l: 58, r: 24, t: 44, b: 46 };

  const { points, path, area, ticks, peak, labels, dayEvery } = useMemo(() => {
    const alts = fill(days);
    const max = Math.max(...alts);
    const min = Math.min(...alts);
    const top = Math.ceil((max + 250) / 500) * 500;
    const bottom = Math.max(0, Math.floor((min - 400) / 500) * 500);
    const span = W - PAD.l - PAD.r;
    const x = (i: number) => PAD.l + (i * span) / Math.max(1, alts.length - 1);
    const y = (a: number) => PAD.t + ((top - a) * (H - PAD.t - PAD.b)) / (top - bottom);
    const pts = alts.map((a, i) => ({ x: x(i), y: y(a), a, d: days[i] }));

    // Smooth curve through every day's altitude.
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cx = (p0.x + p1.x) / 2;
      d += ` C${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
    }
    const step = top - bottom > 3000 ? 1000 : 500;
    const t: { y: number; v: number }[] = [];
    for (let v = bottom; v <= top; v += step) t.push({ y: y(v), v });

    const peakIndex = alts.indexOf(max);
    // Label the ends, the high point and each local summit, never crowded.
    const lab = new Set<number>([0, peakIndex, alts.length - 1]);
    alts.forEach((a, i) => {
      if (i > 0 && i < alts.length - 1 && a > alts[i - 1] && a >= alts[i + 1] && a > (max + min) / 2) lab.add(i);
    });
    const gap = compact ? 92 : 74;
    const ordered = [...lab].sort((a, b) => a - b);
    const spaced: number[] = [];
    for (const v of ordered) {
      const prev = spaced[spaced.length - 1];
      if (prev === undefined || pts[v].x - pts[prev].x > gap) spaced.push(v);
      else if (v === peakIndex) spaced[spaced.length - 1] = v;
    }

    return {
      points: pts,
      path: d,
      area: `${d} L${pts[pts.length - 1].x},${H - PAD.b} L${pts[0].x},${H - PAD.b} Z`,
      ticks: t,
      peak: pts[peakIndex],
      labels: spaced,
      dayEvery: Math.max(1, Math.ceil(26 / (span / Math.max(1, alts.length - 1)))),
    };
  }, [days, W, H, PAD.l, PAD.r, PAD.t, PAD.b, compact]);

  const fmt = (m: number) => (unit === "m" ? `${m.toLocaleString("en-US")} m` : `${Math.round(m * 3.28084).toLocaleString("en-US")} ft`);
  const dark = tone === "dark";
  const active = hover != null ? points[hover] : null;
  const draw = inView || reduce;
  const tipW = Math.min(230, W - 16);
  const slot = (W - PAD.l - PAD.r) / Math.max(1, points.length - 1);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className={cn("font-mono text-[0.7rem] tracking-wider uppercase", dark ? "text-white/55" : "text-muted")}>
          {words.highest} {fmt(peak.a)} · {words.day} {peak.d.day}
        </p>
      </div>

      <div ref={boxRef} className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label={`Altitude profile, highest point ${fmt(peak.a)} on day ${peak.d.day}`}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`alt-fill-${tone}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--glacier)" stopOpacity={dark ? 0.42 : 0.3} />
              <stop offset="100%" stopColor="var(--glacier)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t.v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke={dark ? "white" : "var(--ink)"} strokeOpacity={0.08} strokeDasharray="3 6" />
              <text x={PAD.l - 8} y={t.y + 4} textAnchor="end" fontSize={compact ? 10 : 11} fontFamily="var(--font-mono)" fill={dark ? "white" : "var(--ink)"} fillOpacity={0.5}>
                {unit === "m" ? `${(t.v / 1000).toFixed(1)}k` : `${Math.round((t.v * 3.28084) / 1000)}k`}
              </text>
            </g>
          ))}

          <motion.path d={area} fill={`url(#alt-fill-${tone})`} initial={{ opacity: 0 }} animate={{ opacity: draw ? 1 : 0 }} transition={{ duration: 1.2, delay: 0.9 }} />
          <motion.path
            d={path}
            fill="none"
            stroke="var(--glacier)"
            strokeWidth={compact ? 2.5 : 3}
            strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: draw ? 1 : 0 }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
          />

          {points.map((p, i) => (
            <g key={i}>
              <motion.circle
                cx={p.x}
                cy={p.y}
                r={i === hover ? 7 : labels.includes(i) ? 5 : compact ? 2.5 : 3}
                fill={p === peak ? "var(--marigold)" : dark ? "var(--pine-night)" : "white"}
                stroke={p === peak ? "var(--marigold)" : "var(--glacier)"}
                strokeWidth="2.5"
                initial={{ scale: reduce ? 1 : 0 }}
                animate={{ scale: draw ? 1 : 0 }}
                transition={{ delay: 0.4 + (i / points.length) * 1.8, type: "spring", stiffness: 300, damping: 18 }}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
              />
              {/* Wide invisible target for hover and tap */}
              <rect
                x={p.x - slot / 2}
                y={PAD.t - 30}
                width={slot}
                height={H - PAD.t - PAD.b + 30}
                fill="transparent"
                role="img"
                onPointerEnter={() => setHover(i)}
                onClick={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`Day ${p.d.day}: ${placeOf(p.d.title) || p.d.title}, ${fmt(p.a)}`}
              />
            </g>
          ))}

          {labels.map((i) => {
            const p = points[i];
            const name = placeOf(p.d.title);
            if (!name || i === hover) return null;
            const max = compact ? 12 : 18;
            const anchor = p.x < PAD.l + 30 ? "start" : p.x > W - PAD.r - 30 ? "end" : "middle";
            return (
              <motion.g key={`l${i}`} initial={{ opacity: 0 }} animate={{ opacity: draw ? 1 : 0 }} transition={{ delay: 1.6 }} pointerEvents="none">
                <text x={p.x} y={p.y - 14} textAnchor={anchor} fontSize={compact ? 11 : 12.5} fontWeight="700" fill={dark ? "white" : "var(--ink)"}>
                  {name.length > max ? `${name.slice(0, max - 1)}…` : name}
                </text>
                <text x={p.x} y={p.y - 28} textAnchor={anchor} fontSize={compact ? 9.5 : 10.5} fontFamily="var(--font-mono)" fill={p === peak ? "var(--marigold)" : dark ? "white" : "var(--muted)"} fillOpacity={p === peak ? 1 : 0.7}>
                  {fmt(p.a)}
                </text>
              </motion.g>
            );
          })}

          {points.map((p, i) =>
            i % dayEvery === 0 || i === points.length - 1 ? (
              <text key={`d${i}`} x={p.x} y={H - PAD.b + 20} textAnchor="middle" fontSize={compact ? 9.5 : 10.5} fontFamily="var(--font-mono)" fill={dark ? "white" : "var(--ink)"} fillOpacity={i === hover ? 1 : 0.45}>
                D{p.d.day}
              </text>
            ) : null,
          )}

          {active ? (
            <g pointerEvents="none">
              <line x1={active.x} x2={active.x} y1={active.y} y2={H - PAD.b} stroke="var(--marigold)" strokeDasharray="4 4" />
              <foreignObject x={Math.min(Math.max(active.x - tipW / 2, 4), W - tipW - 4)} y={Math.max(active.y - 82, 0)} width={tipW} height="68">
                <div className="rounded-xl bg-card px-3 py-2 text-[12px] text-ink shadow-xl">
                  <p className="text-[10.5px] font-semibold text-muted">DAY {active.d.day} · {fmt(active.a)} ({Math.round(active.a * 3.28084).toLocaleString("en-US")} ft)</p>
                  <p className="line-clamp-2 font-semibold leading-snug">{placeOf(active.d.title) || active.d.title}</p>
                </div>
              </foreignObject>
            </g>
          ) : null}
        </svg>
      </div>
      <p className={cn("mt-2 text-center text-xs sm:hidden", dark ? "text-white/50" : "text-muted")}>{words.tap}</p>
    </div>
  );
}
