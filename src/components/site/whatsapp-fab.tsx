"use client";

import { usePathname } from "next/navigation";
import { m, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { WhatsappIcon } from "@/components/icons";
import { whatsappHref } from "@/lib/site";

/** Appears once the visitor has scrolled past the first screen. */
export function WhatsappFab() {
  const { scrollY } = useScroll();
  const [show, setShow] = useState(false);
  // Trip pages have a booking bar pinned to the bottom on phones; sit above it.
  const aboveBar = /^\/trip\/[^/]+\/$/.test(usePathname());
  useMotionValueEvent(scrollY, "change", (y) => setShow(y > 600));

  return (
    <m.a
      href={whatsappHref()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      initial={false}
      animate={show ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.6, opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`fixed left-4 z-40 grid size-12 place-items-center sm:size-14 rounded-full bg-[#25D366] text-white shadow-[0_14px_30px_-10px_rgba(37,211,102,0.7)] lg:bottom-8 lg:left-8 ${aboveBar ? "bottom-24" : "bottom-5"}`}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-25" aria-hidden />
      <WhatsappIcon className="relative size-6 sm:size-7" />
    </m.a>
  );
}
