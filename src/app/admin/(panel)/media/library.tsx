"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Search, Trash2, Upload, X } from "lucide-react";
import { uploadFile } from "@/components/admin/form/media-field";
import { inputClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { deleteMediaAction, updateMediaAction } from "./actions";

type Item = { id: string; src: string; width: number; height: number; alt: string; bytes: number; mime: string; folder: string };
const thumb = (src: string) => (src.endsWith(".svg") ? src : `/_next/image?url=${encodeURIComponent(src)}&w=384&q=70`);
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export function MediaLibrary({ siteUrl }: { siteUrl: string }) {
  const [kind, setKind] = useState<"image" | "video">("image");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Item[]; pages: number; total: number } | null>(null);
  const [sel, setSel] = useState<Item | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/media/?${new URLSearchParams({ q, page: String(page), kind })}`);
    if (r.ok) setData(await r.json());
  }, [q, page, kind]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const upload = async (files: FileList | File[]) => {
    setError(null);
    const list = [...files];
    for (const [i, f] of list.entries()) {
      setBusy(`Uploading ${i + 1} of ${list.length}: ${f.name}`);
      try { await uploadFile(f); } catch (e) { setError(`${f.name}: ${(e as Error).message}`); }
    }
    setBusy(null);
    setPage(1);
    await load();
  };

  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) void upload(e.dataTransfer.files); }} className={cn("rounded-3xl", over && "ring-4 ring-pine")}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-line bg-card p-1 text-sm font-semibold">
          {(["image", "video"] as const).map((k) => (
            <button key={k} type="button" onClick={() => { setKind(k); setPage(1); }} className={cn("rounded-full px-4 py-1.5", kind === k ? "bg-pine text-white" : "text-ink-soft")}>{k === "image" ? "Photos" : "Videos"}</button>
          ))}
        </div>
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search…" className={cn(inputClass, "rounded-full pl-9")} />
        </div>
        <input ref={input} type="file" multiple hidden accept="image/*,video/mp4,video/webm" onChange={(e) => e.target.files && void upload(e.target.files)} />
        <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep"><Upload className="size-4" /> Upload</button>
      </div>
      {busy || error ? <p className={cn("mb-4 rounded-xl px-4 py-2 text-sm", error ? "bg-red-50 text-red-700" : "bg-pine/8 text-pine")}>{busy ?? error}</p> : null}
      <p className="mb-3 text-sm text-muted">{data ? `${data.total.toLocaleString()} ${kind === "image" ? "photos" : "videos"}` : "Loading…"} · drop files anywhere here to upload. Photos are optimised automatically without losing quality.</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {data?.items.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => setSel(m)} className="block w-full overflow-hidden rounded-xl border border-line bg-card text-left hover:border-pine">
              {m.mime.startsWith("video/") ? <video src={m.src} muted preload="metadata" className="aspect-square w-full bg-black object-cover" /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb(m.src)} alt={m.alt} loading="lazy" className="aspect-square w-full bg-black/5 object-cover" />
              )}
              <span className="block truncate px-2 pt-1.5 text-xs font-medium">{m.alt || m.src.split("/").pop()}</span>
              <span className="block px-2 pb-1.5 text-[11px] text-muted">{m.width ? `${m.width}×${m.height} · ` : ""}{size(m.bytes)}</span>
            </button>
          </li>
        ))}
      </ul>
      {data && data.pages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-line px-4 py-1.5 disabled:opacity-40">← Previous</button>
          <span className="text-muted">Page {page} of {data.pages}</span>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-line px-4 py-1.5 disabled:opacity-40">Next →</button>
        </div>
      ) : null}
      {sel ? <Details item={sel} siteUrl={siteUrl} onClose={() => setSel(null)} onChanged={() => { setSel(null); void load(); }} /> : null}
    </div>
  );
}

function Details({ item, siteUrl, onClose, onChanged }: { item: Item; siteUrl: string; onClose: () => void; onChanged: () => void }) {
  const [alt, setAlt] = useState(item.alt);
  const [msg, setMsg] = useState<string | null>(null);
  const [usedBy, setUsedBy] = useState<string[]>([]);
  const url = `${siteUrl}${item.src}`;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label="File details" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">File details</h2><button type="button" onClick={onClose} aria-label="Close"><X className="size-5" /></button></div>
        {item.mime.startsWith("video/") ? <video src={item.src} controls className="w-full rounded-xl bg-black" /> : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.src} alt={item.alt} className="w-full rounded-xl bg-black/5" />
        )}
        <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
          <dt className="text-muted">Size</dt><dd>{item.width ? `${item.width} × ${item.height} px · ` : ""}{size(item.bytes)}</dd>
          <dt className="text-muted">Folder</dt><dd>{item.folder}</dd>
          <dt className="text-muted">Address</dt><dd className="font-mono text-xs break-all">{item.src}</dd>
        </dl>
        <button type="button" onClick={() => { void navigator.clipboard.writeText(item.src); setMsg("Address copied."); }} className="mt-3 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine"><Copy className="size-4" /> Copy address</button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="ml-2 text-sm font-semibold text-pine hover:underline">Open ↗</a>
        <label className="mt-5 block text-sm font-semibold" htmlFor="alt">Description (alt text)</label>
        <textarea id="alt" value={alt} onChange={(e) => setAlt(e.target.value)} rows={3} className={cn(inputClass, "mt-1.5")} />
        <p className="mt-1 text-xs text-muted">Describe what's in the photo, e.g. "Trekkers crossing a suspension bridge near Namche Bazaar". Google uses this.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={async () => { const r = await updateMediaAction(item.id, alt); setMsg(r.ok ? "Saved." : r.error); }} className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white">Save</button>
          <button type="button" onClick={async () => {
            if (!confirm("Delete this file for good?")) return;
            const r = await deleteMediaAction(item.id);
            if (r.ok) onChanged(); else { setMsg(r.error); setUsedBy(r.usedBy ?? []); }
          }} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 className="size-4" /> Delete</button>
        </div>
        {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
        {usedBy.length ? <ul className="mt-2 list-disc pl-5 text-sm text-muted">{usedBy.map((u) => <li key={u}>{u}</li>)}</ul> : null}
      </div>
    </div>
  );
}
