"use client";

import { Tr } from "@/components/site/tr";
import Image from "@/components/image";
import { useState } from "react";
import { Images } from "lucide-react";
import { Lightbox } from "@/components/lightbox";
import type { Img } from "@/lib/types";

/** Thumbnails plus "View N photos", opening the full-screen viewer. */
export function GalleryButton({ images, title }: { images: Img[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  if (!images.length) return null;

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="hidden -space-x-3 sm:flex">
          {images.slice(0, 4).map((img, i) => (
            <button key={img.src} type="button" onClick={() => setIndex(i)} className="relative size-14 overflow-hidden rounded-xl border-2 border-white/80 transition-transform hover:z-10 hover:-translate-y-1">
              <Image src={img.src} alt={img.alt || `${title} photo ${i + 1}`} fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setIndex(0)} className="glass-dark inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white hover:bg-white/20">
          <Images className="size-4" aria-hidden /> <Tr vars={{ n: images.length }}>{"View {n} photos"}</Tr>
        </button>
      </div>
      <Lightbox images={images} index={index} onIndex={setIndex} title={title} />
    </>
  );
}
