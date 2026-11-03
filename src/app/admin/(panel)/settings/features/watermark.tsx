"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/admin/ui";
import { undoWatermarkExisting, watermarkExisting, watermarkStatus } from "./watermark-actions";

type S = Awaited<ReturnType<typeof watermarkStatus>>;

/** Adds the logo to the photos already in the galleries, with progress and Undo. */
export function BulkWatermark({ initial }: { initial: S }) {
  const [s, setS] = useState<S>(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const busy = s?.state === "running" || s?.state === "undoing";
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(async () => setS(await watermarkStatus()), 2000);
    return () => clearInterval(t);
  }, [busy]);
  const pct = s && s.total ? Math.round((s.done / s.total) * 100) : 0;
  return (
    <Card title="Watermark the photos already on the site" info="Photos imported from the old website have no watermark. This adds the logo (with the strength and size set above) to every photo in the trip galleries, day photos and community pages. The originals are kept, so Undo puts them back at once. Page banners are not changed: they already show the logo on top.">
      {s?.state === "running" ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Adding the watermark: {s.done} of {s.total} photos</p>
          <div className="h-2 overflow-hidden rounded-full bg-snow-2"><div className="h-full rounded-full bg-pine transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="text-xs text-muted">You can leave this page; it carries on in the background.</p>
        </div>
      ) : s?.state === "undoing" ? (
        <p className="text-sm font-semibold">Putting the original photos back…</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={pending} onClick={() => start(async () => { const r = await watermarkExisting(); setMsg(r.message); setS(await watermarkStatus()); })} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{s?.photos ? "Watermark any new gallery photos" : "Add the watermark to existing gallery photos"}</button>
          {s?.photos ? <button type="button" disabled={pending} onClick={() => start(async () => { const r = await undoWatermarkExisting(); setMsg(r.message); setS(await watermarkStatus()); })} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-red-400 hover:text-red-700">Undo (put the originals back)</button> : null}
        </div>
      )}
      {s?.state === "done" && !busy ? <p className="mt-3 text-sm text-pine">Done: {s.photos} photos watermarked on {s.changed} pages{s.finishedAt ? `, ${new Date(s.finishedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}.</p> : null}
      {s?.state === "failed" ? <p className="mt-3 text-sm text-red-700">Stopped: {s.error}. Press the button again to continue.</p> : null}
      {msg && !busy ? <p role="status" className="mt-2 text-sm text-muted">{msg}</p> : null}
    </Card>
  );
}
