"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accordion of questions. Answers stay in the HTML for search engines. */
export function Faq({ items, tone = "light", defaultOpen = 0 }: { items: { q: string; a: string }[]; tone?: "light" | "dark"; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const dark = tone === "dark";

  return (
    <div className={cn("divide-y border-y", dark ? "divide-white/10 border-white/10" : "divide-line border-line")}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className="cv-auto">
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className={cn("flex w-full items-start justify-between gap-6 py-5 text-left text-lg font-semibold transition-colors", dark ? "text-white hover:text-marigold" : "hover:text-pine")}
              >
                <span>{it.q}</span>
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-300", isOpen ? "bg-marigold border-marigold text-pine-night rotate-45" : dark ? "border-white/20" : "border-line")}>
                  <Plus className="size-4" aria-hidden />
                </span>
              </button>
            </h3>
            {/* Always rendered, only collapsed, so every answer is in the page for search engines. */}
            <m.div
              initial={false}
              animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
              inert={!isOpen}
            >
              <div className={cn("prose-trail pb-6 text-base", dark && "prose-on-dark")} dangerouslySetInnerHTML={{ __html: it.a }} />
            </m.div>
          </div>
        );
      })}
    </div>
  );
}
