"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCompareArrows, Heart, X } from "lucide-react";
import { useState } from "react";
import { COMPARE_MAX, setList, toggle, useList } from "@/lib/shortlist";
import { cn } from "@/lib/utils";

/** Heart + compare buttons over a trip photo. */
export function CardActions({ slug, title, className }: { slug: string; title: string; className?: string }) {
  const saved = useList("saved").includes(slug);
  const comparing = useList("compare").includes(slug);
  const [full, setFull] = useState(false);
  const btn = "grid size-9 place-items-center rounded-full bg-white/95 text-[#242a2c] shadow-md backdrop-blur transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";
  return (
    <div className={cn("flex gap-1.5", className)}>
      <button type="button" aria-pressed={saved} aria-label={saved ? `Remove ${title} from saved trips` : `Save ${title}`} title={saved ? "Saved" : "Save this trip"} onClick={() => toggle("saved", slug)} className={btn}>
        <Heart className={cn("size-4", saved ? "fill-crimson text-crimson" : "")} aria-hidden />
      </button>
      <button type="button" aria-pressed={comparing} aria-label={comparing ? `Remove ${title} from compare` : `Compare ${title}`} title={full ? `Compare up to ${COMPARE_MAX} trips` : comparing ? "In compare" : "Compare"} onClick={() => { const ok = toggle("compare", slug); setFull(!ok); if (!ok) setTimeout(() => setFull(false), 2500); }} className={cn(btn, comparing && "bg-pine text-white", full && "ring-2 ring-crimson")}>
        <GitCompareArrows className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Text buttons for the trip page's booking box. */
export function TripPageActions({ slug, title }: { slug: string; title: string }) {
  const saved = useList("saved").includes(slug);
  const comparing = useList("compare").includes(slug);
  const item = "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-ink-soft hover:text-pine";
  return (
    <div className="flex gap-1">
      <button type="button" aria-pressed={saved} onClick={() => toggle("saved", slug)} className={item} aria-label={saved ? `Remove ${title} from saved trips` : `Save ${title}`}>
        <Heart className={cn("size-4", saved && "fill-crimson text-crimson")} aria-hidden /> {saved ? "Saved" : "Save trip"}
      </button>
      <button type="button" aria-pressed={comparing} onClick={() => toggle("compare", slug)} className={item}>
        <GitCompareArrows className={cn("size-4", comparing && "text-pine")} aria-hidden /> {comparing ? "In compare" : "Compare"}
      </button>
    </div>
  );
}

/** Floating pill with the saved count and the compare list, on every public page. */
export function ShortlistBar() {
  const saved = useList("saved");
  const compare = useList("compare");
  const path = usePathname() ?? "";
  if (!saved.length && !compare.length) return null;
  if (path.startsWith("/compare") && !saved.length) return null;
  const onTrip = /^\/(?:(?:de|fr|es)\/)?trip\/[^/]+\/?$/.test(path);
  return (
    <div className={cn("fixed left-4 z-40 flex items-center gap-1 rounded-full border border-line bg-card/95 p-1 shadow-[0_18px_40px_-20px_oklch(0.2_0.04_170/0.6)] backdrop-blur", onTrip ? "bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:bottom-6" : "bottom-6")}>
      {saved.length ? (
        <Link href="/saved/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold hover:bg-snow-2">
          <Heart className="size-4 fill-crimson text-crimson" aria-hidden /> {saved.length}<span className="sr-only"> saved trips</span><span className="hidden sm:inline">Saved</span>
        </Link>
      ) : null}
      {compare.length && !path.startsWith("/compare") ? (
        <>
          <Link href={`/compare/?trips=${compare.join(",")}`} className="inline-flex items-center gap-1.5 rounded-full bg-pine px-3.5 py-2 text-sm font-bold text-white hover:bg-pine-deep">
            <GitCompareArrows className="size-4" aria-hidden /> Compare {compare.length}/{COMPARE_MAX}
          </Link>
          <button type="button" onClick={() => setList("compare", [])} className="grid size-8 place-items-center rounded-full text-muted hover:bg-snow-2" aria-label="Clear compare list"><X className="size-4" aria-hidden /></button>
        </>
      ) : null}
    </div>
  );
}
