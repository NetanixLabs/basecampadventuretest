"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Backpack, Check, Eye, EyeOff, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { savePacking } from "../../actions";

type Item = { name: string; description: string; image: string; category: string };
type Extra = { name: string; packed: boolean };

/**
 * The traveller's own packing checklist, from the trip's equipment list
 * (the same list as on the trip page). Ticks are saved to their account, so
 * the list is the same on their phone and laptop; each person in a group
 * has their own.
 */
export function Packing({ bookingId, items, initialPacked, initialExtra, group }: { bookingId: string; items: Item[]; initialPacked: string[]; initialExtra: Extra[]; group: boolean }) {
  const [packed, setPacked] = useState<Set<string>>(() => new Set(initialPacked));
  const [extra, setExtra] = useState<Extra[]>(initialExtra);
  const [cat, setCat] = useState("All");
  const [hide, setHide] = useState(false);
  const [mine, setMine] = useState("");
  const [state, setState] = useState<"saved" | "saving" | "error" | "">("");
  const first = useRef(true);

  // Saved a moment after the last tick, so quick ticking is one save.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const t = setTimeout(async () => {
      const r = await savePacking(bookingId, [...packed], extra).catch(() => ({ ok: false }));
      setState(r.ok ? "saved" : "error");
    }, 600);
    return () => clearTimeout(t);
  }, [packed, extra, bookingId]);

  const categories = useMemo(() => ["All", ...new Set(items.map((i) => i.category)), ...(extra.length ? ["My items"] : [])], [items, extra.length]);
  const total = items.length + extra.length;
  const done = items.filter((i) => packed.has(i.name)).length + extra.filter((e) => e.packed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const shown = items.filter((i) => (cat === "All" || i.category === cat) && !(hide && packed.has(i.name)));
  const shownExtra = cat === "All" || cat === "My items" ? extra.map((e, idx) => ({ ...e, idx })).filter((e) => !(hide && e.packed)) : [];

  const toggle = (name: string) => setPacked((p) => { const n = new Set(p); if (n.has(name)) n.delete(name); else n.add(name); return n; });
  const add = () => {
    const name = mine.replace(/[<>]/g, "").trim().slice(0, 80);
    if (!name || extra.length >= 40 || extra.some((e) => e.name.toLowerCase() === name.toLowerCase())) return;
    setExtra((x) => [...x, { name, packed: false }]);
    setMine("");
  };
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-glacier-soft p-4 sm:p-5">
        <div className="relative size-16 shrink-0" aria-hidden>
          <svg viewBox="0 0 64 64" className="size-16 -rotate-90"><circle cx="32" cy="32" r={R} fill="none" stroke="currentColor" strokeWidth="6" className="text-line" /><circle cx="32" cy="32" r={R} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} className="text-pine transition-[stroke-dashoffset] duration-500" /></svg>
          <span className="absolute inset-0 grid place-items-center text-sm font-bold">{pct}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold" role="status" aria-live="polite">{done === total && total ? "Everything is packed. Have a wonderful trip!" : `${done} of ${total} packed`}</p>
          <p className="text-xs text-muted">{group ? "Your own list; everyone in the group has theirs. " : ""}{state === "saving" ? "Saving…" : state === "saved" ? "Saved to your trip page." : state === "error" ? "Not saved, check your connection." : "Ticks are saved, on your phone and computer."}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setHide((h) => !h)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold hover:border-pine hover:text-pine">{hide ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}{hide ? "Show packed" : "Hide packed"}</button>
          <button type="button" disabled={!done} onClick={() => { if (confirm("Untick everything?")) { setPacked(new Set()); setExtra((x) => x.map((e) => ({ ...e, packed: false }))); } }} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold hover:border-pine hover:text-pine disabled:opacity-40"><RotateCcw className="size-3.5" aria-hidden />Reset</button>
        </div>
      </div>

      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Categories">
        {categories.map((c) => {
          const inCat = c === "All" ? null : c === "My items" ? extra : items.filter((i) => i.category === c);
          const left = inCat ? inCat.filter((i) => !("packed" in i ? i.packed : packed.has(i.name))).length : total - done;
          return (
            <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors", cat === c ? "border-pine bg-pine text-white" : "border-line bg-card hover:border-pine hover:text-pine")}>
              {c}{left ? <span className={cn("ml-1.5", cat === c ? "text-white/75" : "text-muted")}>{left}</span> : <Check className="ml-1 inline size-3" aria-label="all packed" />}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {shown.map((i) => {
          const on = packed.has(i.name);
          return (
            <li key={i.name}>
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 pr-3.5 transition-colors", on ? "border-pine/40 bg-pine/6" : "border-line bg-card hover:border-pine/50")}>
                <input type="checkbox" checked={on} onChange={() => toggle(i.name)} className="peer sr-only" />
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-glacier-soft">
                  {i.image ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={i.image} alt="" loading="lazy" className={cn("size-12 object-contain transition-opacity", on && "opacity-50")} />) : <Backpack className="size-6 text-pine/60" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold leading-snug", on && "text-muted line-through decoration-pine/50")}>{i.name}</span>
                  {i.description ? <span className="mt-0.5 block text-xs leading-snug text-muted">{i.description}</span> : <span className="mt-0.5 block text-[11px] tracking-wide text-muted uppercase">{i.category}</span>}
                </span>
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-pine/50", on ? "border-pine bg-pine text-white" : "border-line")} aria-hidden>{on ? <Check className="size-4" strokeWidth={3} /> : null}</span>
              </label>
            </li>
          );
        })}
        {shownExtra.map((e) => (
          <li key={`x-${e.name}`}>
            <div className={cn("flex items-center gap-3 rounded-xl border p-2.5 pr-2 transition-colors", e.packed ? "border-pine/40 bg-pine/6" : "border-dashed border-line bg-card")}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={e.packed} onChange={() => setExtra((x) => x.map((y, k) => (k === e.idx ? { ...y, packed: !y.packed } : y)))} className="peer sr-only" />
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-pine/50", e.packed ? "border-pine bg-pine text-white" : "border-line")} aria-hidden>{e.packed ? <Check className="size-4" strokeWidth={3} /> : null}</span>
                <span className={cn("truncate text-sm font-semibold", e.packed && "text-muted line-through decoration-pine/50")}>{e.name}</span>
              </label>
              <button type="button" aria-label={`Remove ${e.name}`} onClick={() => setExtra((x) => x.filter((_, k) => k !== e.idx))} className="rounded-full p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><X className="size-4" /></button>
            </div>
          </li>
        ))}
      </ul>
      {!shown.length && !shownExtra.length ? <p className="mt-4 rounded-xl bg-pine/6 p-4 text-center text-sm font-semibold text-pine">All packed in this category.</p> : null}

      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={mine} onChange={(e) => setMine(e.target.value)} maxLength={80} placeholder="Add your own item (e.g. camera, snacks)" aria-label="Add your own item" className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm focus:border-pine focus:outline-none" />
        <button disabled={!mine.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-40"><Plus className="size-4" aria-hidden />Add</button>
      </form>
    </div>
  );
}
