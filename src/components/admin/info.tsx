"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info as InfoIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small ⓘ button that opens a short explanation. Keeps forms clean while
 * the guidance stays one click away. Opens on click or tap (and keyboard),
 * closes on Escape, a second click or a click elsewhere.
 */
export function Info({ children, label = "More information", className, align = "left" }: { children: React.ReactNode; label?: string; className?: string; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span ref={box} className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        className={cn("grid size-5 place-items-center rounded-full text-muted transition-colors hover:bg-pine/10 hover:text-pine focus-visible:outline-2 focus-visible:outline-pine", open && "bg-pine/10 text-pine")}
      >
        <InfoIcon className="size-3.5" aria-hidden />
      </button>
      {open ? (
        <span
          id={id}
          role="note"
          className={cn(
            "absolute top-7 z-50 block w-72 max-w-[80vw] rounded-xl border border-line bg-card p-3 pr-8 text-left text-xs leading-relaxed font-normal tracking-normal normal-case text-ink-soft shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute top-2 right-2 text-muted hover:text-pine"><X className="size-3.5" /></button>
        </span>
      ) : null}
    </span>
  );
}

/** A folded "How this works" box for longer guidance on a page. */
export function Guide({ title = "How this works", children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-2xl border border-pine/20 bg-pine/[0.04]", className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-pine">
        <InfoIcon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1">{title}</span>
        <span className="text-xs font-medium text-muted">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <div className="space-y-2 px-4 pb-4 pl-10 text-sm leading-relaxed text-ink-soft">{children}</div> : null}
    </div>
  );
}
