"use client";

import { useState } from "react";

/** A review's text, folded to a few lines when long, with "Read more". */
export function ReviewText({ text, lines = 7 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 420;
  return (
    <>
      <p className="leading-relaxed text-ink-soft" style={!open && long ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>
        {text}
      </p>
      {long ? (
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-pine mt-2 text-sm font-bold hover:underline relative after:absolute after:-inset-y-3 after:-inset-x-1.5 after:content-['']">
          {open ? "Show less" : "Read more"}
        </button>
      ) : null}
    </>
  );
}
