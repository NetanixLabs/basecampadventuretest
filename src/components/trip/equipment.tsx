"use client";

import Image from "@/components/image";
import { useState } from "react";
import { Backpack, Check, ChevronDown, RotateCcw } from "lucide-react";
import { Accent, SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";

type EquipmentItem = { name: string; description: string; image: string; category: string };

export function Equipment({ items }: { items: EquipmentItem[] }) {
  const [category, setCategory] = useState("All items");
  const [packed, setPacked] = useState<Set<number>>(new Set());
  // The full list is long on a phone: the first items, then the rest on request.
  const [all, setAll] = useState(false);
  const FIRST = 8;
  const collapsed = category === "All items" && !all && items.length > FIRST + 2;
  const categories = ["All items", ...new Set(items.map((item) => item.category))];
  const percent = Math.round(packed.size / items.length * 100);

  return (
    <section id="equipment" className="scroll-mt-40">
      <SectionHeading eyebrow="Equipment" lines={["Pack well.", <Accent key="ready">Trek ready.</Accent>]} intro="A practical packing list for your journey. Adjust it to the season, route, and your personal needs. Confirm supplied or rental equipment with our team before you travel." />

      <details className="group mt-8 overflow-hidden rounded-2xl border border-line bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3"><Backpack className="size-5 text-pine" aria-hidden /> Your packing overview</span>
          <ChevronDown className="size-5 shrink-0 text-pine transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
        </summary>
        <div className="border-t border-line bg-white p-4">
          <div className="relative mx-auto max-w-2xl">
            <Image src="/equipment/trekking-equipment-overview.webp" alt="Illustrated overview of trekking clothing, footwear, and equipment" width={1024} height={746} sizes="(max-width: 1024px) 100vw, 60vw" className="h-auto w-full" />
          </div>
        </div>
      </details>

      <div className="mt-6 rounded-2xl border border-line bg-glacier-soft p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-ink">Your packing checklist</h3>
            <p className="mt-1 text-sm text-muted" role="status" aria-live="polite">{packed.size} of {items.length} items packed</p>
          </div>
          <button type="button" disabled={!packed.size} onClick={() => setPacked(new Set())} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-pine transition-colors hover:bg-card disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine">
            <RotateCcw className="size-3.5" aria-hidden /> Reset
          </button>
        </div>
        <div role="progressbar" aria-label="Packing progress" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={packed.size} className="mt-4 h-1.5 overflow-hidden rounded-full bg-pine/10">
          <div className="h-full rounded-full bg-pine transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div role="group" aria-label="Filter equipment by category" className="mt-6 flex flex-wrap gap-2">
        {categories.map((name) => (
          <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)} className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine motion-reduce:transition-none", category === name ? "border-pine bg-pine text-white" : "border-line bg-card text-ink-soft hover:border-pine hover:text-pine")}>
            {name}
          </button>
        ))}
      </div>

      <ul className="mt-5 grid items-start gap-3 sm:grid-cols-2">
        {items.map((item, index) => (category !== "All items" && item.category !== category) || (collapsed && index >= FIRST) ? null : (
          <li key={`${item.name}-${index}`} className={cn("cv-auto rounded-2xl border bg-card p-4 transition-colors duration-200 motion-reduce:transition-none", packed.has(index) ? "border-pine/35 bg-glacier-soft/40" : "border-line hover:border-pine/35")}>
            <div className="flex items-start gap-3">
              <label className="relative mt-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md">
                <input type="checkbox" checked={packed.has(index)} aria-label={`Packed: ${item.name}`} onChange={() => setPacked((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} className="peer absolute inset-0 size-6 cursor-pointer appearance-none rounded-md border border-line bg-card checked:border-pine checked:bg-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine" />
                <Check className="pointer-events-none relative size-4 text-white opacity-0 peer-checked:opacity-100" aria-hidden />
              </label>
              <details className="group min-w-0 flex-1">
                <summary className="flex cursor-pointer list-none items-start gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">{item.category}</span>
                    <h4 className="mt-1 text-sm font-bold leading-snug text-ink">{item.name}</h4>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-pine">View item <ChevronDown className="size-3 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden /></span>
                  </div>
                  <span className="relative block size-16 shrink-0 overflow-hidden">
                    <Image src={item.image.replace(/\.webp$/, "-thumb.webp")} alt="" fill sizes="64px" unoptimized className="object-contain p-1" />
                  </span>
                </summary>
                {item.description ? <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.description}</p> : null}
                <div className="relative mt-3 h-56 w-full overflow-hidden">
                  <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 80vw, 400px" unoptimized className="object-contain p-4" />
                </div>
              </details>
            </div>
          </li>
        ))}
      </ul>
      {collapsed ? (
        <button type="button" onClick={() => setAll(true)} className="mt-4 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-pine transition-colors hover:border-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine">
          Show all {items.length} items
        </button>
      ) : null}
      <p className="mt-5 text-xs leading-relaxed text-muted">Images illustrate the type of equipment; brands and models may vary. Your checklist stays checked while this page is open.</p>
    </section>
  );
}
