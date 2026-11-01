"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { reorderAction } from "../actions";
import { cn } from "@/lib/utils";

/** Put items in the order the website shows them: drag, or use the arrows. */
export function Reorder({ collection, rows }: { collection: string; rows: { id: string; title: string; status: string }[] }) {
  const router = useRouter();
  const [list, setList] = useState(rows);
  const [drag, setDrag] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setList(next);
  };
  const changed = list.some((r, i) => r.id !== rows[i].id);
  return (
    <div className="rounded-2xl border border-line bg-card p-3 sm:p-4">
      <ol className="space-y-1.5">
        {list.map((r, i) => (
          <li
            key={r.id}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
            className={cn("flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm", drag === i && "opacity-50", r.status !== "published" && "opacity-60")}
          >
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted" aria-hidden />
            <span className="w-6 shrink-0 text-xs font-bold text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.title}{r.status !== "published" ? " (draft)" : ""}</span>
            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-pine/8 hover:text-pine disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button type="button" onClick={() => move(i, i + 1)} disabled={i === list.length - 1} aria-label="Move down" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-pine/8 hover:text-pine disabled:opacity-30"><ArrowDown className="size-4" /></button>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!changed || pending} onClick={() => start(async () => { const r = await reorderAction(collection, list.map((x) => x.id)); setMsg(r.ok ? "Order saved. The website shows the new order." : r.error); if (r.ok) router.refresh(); })} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Saving…" : "Save order"}</button>
        {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      </div>
    </div>
  );
}
