"use client";

import Image from "@/components/image";
import { useMemo, useState } from "react";
import { m } from "framer-motion";
import { Camera, Expand, Images } from "lucide-react";
import { WhatsappIcon } from "@/components/icons";
import { Lightbox, type LightboxImage } from "@/components/lightbox";
import { PhotoGlow } from "@/components/photo-glow";
import { cn } from "@/lib/utils";

export type TravellerPhoto = LightboxImage & { traveller: string; date?: string | null };

/**
 * The trip's gallery: our own photographs and, once posted from the admin,
 * photos sent by travellers on this journey. A mosaic of 3:2 tiles (so no
 * photo is cut awkwardly), every one opening the full-screen viewer.
 */
export function TripPhotos({ title, ours, travellers, shareHref }: { title: string; ours: LightboxImage[]; travellers: TravellerPhoto[]; shareHref: string }) {
  const [tab, setTab] = useState<"all" | "ours" | "travellers">("all");
  const [index, setIndex] = useState<number | null>(null);

  const list: LightboxImage[] = useMemo(() => {
    const t = travellers.map((p) => ({ ...p, caption: `Photo by ${p.traveller}` }));
    if (tab === "ours") return ours;
    if (tab === "travellers") return t;
    return [...t, ...ours];
  }, [tab, ours, travellers]);

  if (!ours.length && !travellers.length) return null;
  const shown = list.slice(0, 5);
  const more = list.length - shown.length;

  return (
    <div>
      {travellers.length ? (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Show photos">
          {(
            [
              { k: "all", l: `All photos · ${ours.length + travellers.length}` },
              { k: "travellers", l: `From travellers · ${travellers.length}` },
              { k: "ours", l: `From our team · ${ours.length}` },
            ] as const
          ).map((b) => (
            <button
              key={b.k}
              type="button"
              aria-pressed={tab === b.k}
              onClick={() => setTab(b.k)}
              className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors", tab === b.k ? "text-white" : "border border-line bg-card text-ink-soft hover:text-ink")}
            >
              {tab === b.k ? <m.span layoutId="trip-photos-tab" className="bg-pine absolute inset-0 rounded-full" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
              <span className="relative">{b.l}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {shown.map((p, i) => {
          const last = i === shown.length - 1 && more > 0;
          return (
            <button
              key={p.src + tab}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={last ? undefined : `Open photo ${i + 1}: ${p.alt || title}`}
              className={cn("group relative isolate overflow-hidden rounded-xl bg-snow-2 text-left", i === 0 ? "col-span-2 aspect-[3/2] lg:row-span-2 lg:aspect-auto" : "aspect-[3/2]")}
            >
              {i === 0 ? <PhotoGlow src={p.src} strength="sm" /> : null}
              <Image
                src={p.src}
                alt={p.alt || `${title} photo ${i + 1}`}
                fill
                sizes={i === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"}
                quality={80}
                className="object-cover object-right-bottom transition-transform duration-[900ms] ease-[var(--ease-trail)] group-hover:scale-[1.03]"
              />
              <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              {p.caption && !last ? (
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[0.7rem] font-semibold text-white backdrop-blur">
                  <Camera className="size-3" aria-hidden /> {p.caption.replace("Photo by ", "")}
                </span>
              ) : null}
              {!last ? (
                <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                  <Expand className="size-3.5" aria-hidden />
                </span>
              ) : (
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-white backdrop-blur-[2px]">
                  <span className="text-center">
                    <Images className="mx-auto size-6" aria-hidden />
                    <span className="font-display mt-1 block text-2xl">+{more}</span>
                    <span className="text-xs font-semibold text-white/80">
                      View all<span className="sr-only"> {list.length} photos</span>
                    </span>
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-dashed border-line bg-snow-2/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="flex items-start gap-3 text-sm text-ink-soft">
          <Camera className="text-pine mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <strong className="text-ink">Travelled with us?</strong> Send us your photos from this journey and we&apos;ll add them here.
          </span>
        </p>
        <a href={shareHref} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold hover:border-pine">
          <WhatsappIcon className="size-4 text-[#25D366]" /> Share your photos
        </a>
      </div>

      <Lightbox images={list} index={index} onIndex={setIndex} title={title} />
    </div>
  );
}
