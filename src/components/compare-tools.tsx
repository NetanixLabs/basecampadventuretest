"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { setList, useList } from "@/lib/shortlist";

/** Keeps the URL and this browser's compare list in step. */
export function CompareSync({ current }: { current: string[] }) {
  const list = useList("compare");
  const router = useRouter();
  const key = current.join(",");
  const mine = list.join(",");
  const synced = useRef(false);
  useEffect(() => {
    // Without trips in the address, show this browser's list once it has loaded.
    if (!key) { if (mine) router.replace(`/compare/?trips=${mine}`); return; }
    // A shared link wins over what this browser had, once.
    if (!synced.current && key !== mine) setList("compare", current);
    synced.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mine]);
  return null;
}

export function RemoveFromCompare({ slug }: { slug: string }) {
  const list = useList("compare");
  const router = useRouter();
  return (
    <button type="button" onClick={() => { const next = list.filter((s) => s !== slug); setList("compare", next); router.replace(next.length ? `/compare/?trips=${next.join(",")}` : "/compare/"); }} className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/95 text-[#242a2c] shadow" aria-label="Remove from compare">
      <X className="size-4" aria-hidden />
    </button>
  );
}
