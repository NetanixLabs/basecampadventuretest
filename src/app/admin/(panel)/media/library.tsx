"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CheckSquare, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, FolderOpen, Loader2, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { MediaPicker, UploadBar, kb, thumb, uploadFile, uploadMany, type Item, type Progress } from "@/components/admin/form/media-field";
import { inputClass } from "@/components/admin/ui";
import { useStepUp } from "@/components/admin/step-up";
import type { Use } from "@/lib/admin/media-usage";
import { cn } from "@/lib/utils";
import { deleteManyAction, deleteMediaAction, replaceMediaAction, updateMediaAction, usageAction } from "./actions";

type Data = { items: Item[]; pages: number; total: number; folders: { name: string; count: number }[] };
type Show = "" | "unused" | "noalt";

export function MediaLibrary({ siteUrl, canPublish }: { siteUrl: string; canPublish: boolean }) {
  const [kind, setKind] = useState<"image" | "video">("image");
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState("");
  const [sort, setSort] = useState("new");
  const [show, setShow] = useState<Show>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [wmRule, setWmRule] = useState<{ enabled: boolean; scope: string } | null>(null);
  const [wmChoice, setWmChoice] = useState<boolean | null>(null);
  const watermark = wmChoice ?? Boolean(wmRule?.enabled && wmRule.scope === "all");
  const [open, setOpen] = useState<number | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Progress | null>(null);
  const [note, setNote] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const stepUp = useStepUp();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/media/?${new URLSearchParams({ q, page: String(page), kind, folder, sort, show })}`);
    if (r.ok) { const j = await r.json(); setData(j); if (j.watermark) setWmRule(j.watermark); }
    else setNote({ tone: "red", text: "Couldn't load the library. Are you still signed in?" });
    setLoading(false);
  }, [q, page, kind, folder, sort, show]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const upload = async (files: FileList | File[]) => {
    setNote(null);
    const list = [...files];
    const { done, errors } = await uploadMany(list, { watermark: wmRule?.enabled ? watermark : undefined, onProgress: setProgress });
    setNote(errors.length ? { tone: "red", text: errors.join(" ") } : { tone: "green", text: `${done.length} ${done.length === 1 ? "file" : "files"} uploaded.` });
    setPage(1); setShow(""); setSort("new"); setQ(""); setFolder("");
    await load();
  };

  const reset = (fn: () => void) => { fn(); setPage(1); setSelected(new Set()); };
  const items = data?.items ?? [];
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const bulkDelete = async () => {
    if (!(await stepUp({ purpose: "delete", title: `Delete ${selected.size} ${selected.size === 1 ? "file" : "files"} for good`, detail: "Files still used on the website are skipped. This can't be undone.", action: "Delete", danger: true }))) return;
    const r = await deleteManyAction([...selected]);
    if (!r.ok) return setNote({ tone: "red", text: r.error });
    setNote({ tone: r.kept ? "red" : "green", text: `${r.deleted} deleted.${r.kept ? ` ${r.kept} kept because the website still uses them.` : ""}` });
    setSelected(new Set());
    await load();
  };

  return (
    <div
      onDragOver={(e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={(e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setOver(false); void upload(e.dataTransfer.files); }}
      className={cn("relative rounded-3xl pb-24", over && "ring-4 ring-pine ring-offset-4 ring-offset-transparent")}
    >
      {over ? <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-pine/20 backdrop-blur-[1px]"><p className="rounded-2xl bg-card px-6 py-4 text-lg font-bold text-pine shadow-xl">Drop to upload</p></div> : null}

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-line bg-card p-1 text-sm font-semibold">
          {(["image", "video"] as const).map((k) => (
            <button key={k} type="button" onClick={() => reset(() => { setKind(k); setFolder(""); })} className={cn("rounded-full px-4 py-1.5", kind === k ? "bg-pine text-white" : "text-ink-soft hover:text-pine")}>{k === "image" ? "Photos" : "Videos"}</button>
          ))}
        </div>
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="Search by description or file name…" className={cn(inputClass, "rounded-full pl-9")} />
        </div>
        <input ref={input} type="file" multiple hidden accept="image/*,.heic,.heif,video/mp4,video/webm" onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = ""; }} />
        {wmRule?.enabled ? (
          <label className="flex items-center gap-2 text-sm font-semibold" title="Adds our logo, bottom right, to photos you upload now">
            <input type="checkbox" checked={watermark} onChange={(e) => setWmChoice(e.target.checked)} className="size-4 accent-[var(--pine)]" /> Logo on new photos
          </label>
        ) : null}
        <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep"><Upload className="size-4" /> Upload</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([["", "All"], ["unused", "Not used anywhere"], ["noalt", "Needs a description"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => reset(() => setShow(k))} className={cn("rounded-full border px-3.5 py-1.5 text-xs font-semibold transition", show === k ? "border-pine bg-pine/10 text-pine" : "border-line bg-card text-ink-soft hover:border-pine")}>{label}</button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <select value={folder} onChange={(e) => reset(() => setFolder(e.target.value))} className={cn(inputClass, "w-auto rounded-full py-1.5 text-xs font-semibold")} aria-label="Folder">
          <option value="">All folders</option>
          {data?.folders.map((f) => <option key={f.name} value={f.name}>{f.name} ({f.count})</option>)}
        </select>
        <select value={sort} onChange={(e) => reset(() => setSort(e.target.value))} className={cn(inputClass, "w-auto rounded-full py-1.5 text-xs font-semibold")} aria-label="Sort">
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
          <option value="name">By name</option>
          <option value="big">Largest files</option>
          <option value="small">Smallest pictures</option>
        </select>
        <button type="button" onClick={() => { setSelecting((s) => !s); setSelected(new Set()); }} className={cn("ml-auto inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold", selecting ? "border-pine bg-pine text-white" : "border-line bg-card hover:border-pine")}>
          <CheckSquare className="size-3.5" /> {selecting ? "Done selecting" : "Select"}
        </button>
      </div>

      {progress ? <div className="mb-4"><UploadBar progress={progress} /></div> : null}
      {note ? (
        <p role="status" className={cn("mb-4 flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm", note.tone === "green" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200")}>
          <span className="flex-1">{note.text}</span><button type="button" onClick={() => setNote(null)} aria-label="Dismiss"><X className="size-4" /></button>
        </p>
      ) : null}

      <p className="mb-3 flex items-center gap-2 text-sm text-muted">
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {data ? `${data.total.toLocaleString()} ${kind === "image" ? "photos" : "videos"}${show === "unused" ? " not used anywhere" : show === "noalt" ? " need a description" : ""}` : "Loading…"}
        <span className="hidden sm:inline">· drop files anywhere here to upload</span>
      </p>

      {/* Grid */}
      {data && !items.length ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">
          {show === "unused" ? "Every file is in use. Nothing to tidy up." : show === "noalt" ? "Every photo has a description. Well done." : q ? "Nothing found." : "No files yet. Drop some here."}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {!data ? Array.from({ length: 18 }, (_, i) => <li key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-line/60" />) : items.map((m, i) => {
            const on = selected.has(m.id);
            return (
              <li key={m.id}>
                <button type="button" onClick={() => (selecting ? toggle(m.id) : setOpen(i))} className={cn("group relative block w-full overflow-hidden rounded-xl border bg-card text-left transition hover:shadow-md", on ? "border-pine ring-3 ring-pine/25" : "border-line hover:border-pine")}>
                  {m.mime.startsWith("video/") ? <video src={m.src} muted preload="metadata" className="aspect-square w-full bg-black object-cover" /> : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb(m.src)} alt={m.alt} loading="lazy" className="aspect-square w-full bg-black/5 object-cover" />
                  )}
                  {selecting ? <span className={cn("absolute top-2 left-2 grid size-6 place-items-center rounded-md border-2 shadow", on ? "border-pine bg-pine text-white" : "border-white bg-black/20")}>{on ? <Check className="size-4" /> : null}</span> : null}
                  <span className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    {m.unused ? <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white">Not used</span> : null}
                    {m.weakAlt && !m.mime.startsWith("video/") ? <span className="rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold text-amber-950">No description</span> : null}
                  </span>
                  <span className="block truncate px-2 pt-1.5 text-xs font-medium">{m.alt || m.src.split("/").pop()}</span>
                  <span className="block px-2 pb-1.5 text-[11px] text-muted">{m.width ? `${m.width}×${m.height} · ` : ""}{kb(m.bytes)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {data && data.pages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-4 py-1.5 font-semibold disabled:opacity-40"><ChevronLeft className="size-4" /> Previous</button>
          <span className="text-muted tabular-nums">Page {page} of {data.pages}</span>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-4 py-1.5 font-semibold disabled:opacity-40">Next <ChevronRight className="size-4" /></button>
        </div>
      ) : null}

      {/* Bulk bar */}
      {selecting ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
            <p className="mr-auto text-sm font-semibold">{selected.size} selected</p>
            <button type="button" onClick={() => setSelected(new Set(items.map((m) => m.id)))} className="text-sm font-semibold text-pine hover:underline">Select all on this page</button>
            {selected.size ? <button type="button" onClick={() => setSelected(new Set())} className="text-sm font-semibold text-muted hover:text-ink">Clear</button> : null}
            <button type="button" disabled={!selected.size} onClick={bulkDelete} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"><Trash2 className="size-4" /> Delete selected</button>
          </div>
        </div>
      ) : null}

      {open !== null && items[open] ? (
        <Details
          key={items[open].id}
          item={items[open]}
          siteUrl={siteUrl}
          canPublish={canPublish}
          position={`${open + 1} of ${items.length}`}
          onPrev={open > 0 ? () => setOpen(open - 1) : undefined}
          onNext={open < items.length - 1 ? () => setOpen(open + 1) : undefined}
          onClose={() => setOpen(null)}
          onChanged={(text) => { if (text) setNote({ tone: "green", text }); setOpen(null); void load(); }}
          onSaved={(alt) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === items[open].id ? { ...x, alt, weakAlt: !alt.trim() } : x)) } : d))}
        />
      ) : null}
    </div>
  );
}

function Details({ item, siteUrl, canPublish, position, onPrev, onNext, onClose, onChanged, onSaved }: {
  item: Item; siteUrl: string; canPublish: boolean; position: string;
  onPrev?: () => void; onNext?: () => void; onClose: () => void; onChanged: (note?: string) => void; onSaved: (alt: string) => void;
}) {
  const [alt, setAlt] = useState(item.alt);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [usedBy, setUsedBy] = useState<Use[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState<Item | null>(null);
  const [picker, setPicker] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const stepUp = useStepUp();
  const isVideo = item.mime.startsWith("video/");
  const url = `${siteUrl}${item.src}`;

  useEffect(() => {
    let live = true;
    void usageAction(item.id).then((r) => { if (live) setUsedBy(r.ok ? r.usedBy : []); });
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", key);
    return () => { live = false; window.removeEventListener("keydown", key); };
  }, [item.id, onClose, onPrev, onNext]);

  const saveAlt = async () => {
    setBusy(true);
    const r = await updateMediaAction(item.id, alt);
    setBusy(false);
    setMsg(r.ok ? { tone: "green", text: "Description saved." } : { tone: "red", text: r.error });
    if (r.ok) onSaved(alt);
  };

  const replace = async () => {
    if (!candidate) return;
    if (!(await stepUp({ purpose: "replace", title: `Replace this ${isVideo ? "video" : "photo"} on ${usedBy?.length ?? 0} ${usedBy?.length === 1 ? "page" : "pages"}`, detail: "It changes on the live website at once. Each page keeps a version from before in its history.", action: "Replace everywhere" }))) return;
    setBusy(true);
    const r = await replaceMediaAction(item.id, candidate.id);
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "red", text: r.error });
    onChanged(`Photo replaced in ${r.entries + r.sections} ${r.entries + r.sections === 1 ? "place" : "places"} and live on the website. The old file is now unused; you can delete it.`);
  };

  const uploadReplacement = async (files: FileList) => {
    const f = files[0];
    if (!f) return;
    setMsg(null);
    try {
      const done = await uploadFile(f, item.folder, undefined, (percent) => setProgress({ name: f.name, index: 1, count: 1, percent }));
      setCandidate(done);
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    }
    setProgress(null);
  };

  const inUse = Boolean(usedBy?.length);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label="File details" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <h2 className="mr-auto text-lg font-bold">{isVideo ? "Video" : "Photo"} details</h2>
          <span className="text-xs text-muted tabular-nums">{position}</span>
          <button type="button" disabled={!onPrev} onClick={onPrev} className="grid size-8 place-items-center rounded-full border border-line disabled:opacity-30" aria-label="Previous"><ChevronLeft className="size-4" /></button>
          <button type="button" disabled={!onNext} onClick={onNext} className="grid size-8 place-items-center rounded-full border border-line disabled:opacity-30" aria-label="Next"><ChevronRight className="size-4" /></button>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full border border-line" aria-label="Close"><X className="size-4" /></button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div className="grid place-items-center overflow-hidden rounded-2xl bg-black/[0.04] dark:bg-white/5">
            {isVideo ? <video src={item.src} controls className="w-full bg-black" /> : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb(item.src, 1200)} alt={item.alt} className="max-h-80 w-auto max-w-full object-contain" />
            )}
          </div>

          <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-muted">Size</dt><dd>{item.width ? `${item.width} × ${item.height} px · ` : ""}{kb(item.bytes)}</dd>
            <dt className="text-muted">Folder</dt><dd>{item.folder}</dd>
            {item.originalName ? <><dt className="text-muted">Original file</dt><dd className="truncate">{item.originalName}</dd></> : null}
            {item.createdAt ? <><dt className="text-muted">Added</dt><dd>{new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</dd></> : null}
            <dt className="text-muted">Address</dt><dd className="font-mono text-xs break-all">{item.src}</dd>
          </dl>
          <div className="-mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { void navigator.clipboard.writeText(item.src); setMsg({ tone: "green", text: "Address copied." }); }} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-pine"><Copy className="size-3.5" /> Copy address</button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-pine"><ExternalLink className="size-3.5" /> Open</a>
            <a href={item.src} download className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-pine"><Download className="size-3.5" /> Download</a>
          </div>

          {!isVideo ? (
            <section>
              <label className="block text-sm font-semibold" htmlFor="alt">Description (alt text)</label>
              <textarea id="alt" value={alt} onChange={(e) => setAlt(e.target.value)} rows={2} className={cn(inputClass, "mt-1.5", item.weakAlt && alt === item.alt && "border-amber-300")} />
              <p className="mt-1 text-xs text-muted">Describe what's in the photo, e.g. "Trekkers crossing a suspension bridge near Namche Bazaar". Google uses this. New uses of the photo start with it.</p>
              <button type="button" disabled={busy || alt === item.alt} onClick={saveAlt} className="mt-2 rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">Save description</button>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold">Used on the website</h3>
            {usedBy === null ? <p className="mt-2 flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Checking…</p>
              : usedBy.length ? (
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {usedBy.map((u, i) => (
                    <li key={i}>
                      {u.href ? (
                        <Link href={u.href} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-pine/5">
                          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{u.label}</span><span className="text-xs text-muted">{u.where}</span></span>
                          <ArrowRight className="size-4 text-pine" />
                        </Link>
                      ) : <p className="px-3 py-2 text-sm"><span className="block font-medium">{u.label}</span><span className="text-xs text-muted">{u.where}</span></p>}
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-muted">Not used anywhere. It's safe to delete.</p>}
          </section>

          {canPublish && inUse && !usedBy?.some((u) => !u.href) ? (
            <section className="rounded-2xl border border-pine/30 bg-pine/[0.04] p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><RefreshCw className="size-4 text-pine" /> Replace everywhere</h3>
              <p className="mt-1 text-xs text-muted">Put another {isVideo ? "video" : "photo"} in place of this one on all {usedBy!.length} {usedBy!.length === 1 ? "place" : "places"} above, in one step. It goes live straight away. Each page keeps a version from before, in its history.</p>
              <input ref={file} type="file" hidden accept={isVideo ? "video/mp4,video/webm" : "image/*,.heic,.heif"} onChange={(e) => { if (e.target.files) void uploadReplacement(e.target.files); e.target.value = ""; }} />
              {progress ? <div className="mt-3"><UploadBar progress={progress} /></div> : null}
              {candidate ? (
                <div className="mt-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <figure className="text-center">{/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb(item.src)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" /><figcaption className="mt-1 text-[11px] text-muted">Now</figcaption></figure>
                    <ArrowRight className="size-5 text-pine" />
                    <figure className="text-center">{/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb(candidate.src)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover ring-2 ring-pine" /><figcaption className="mt-1 text-[11px] text-muted">New · {candidate.width}×{candidate.height}</figcaption></figure>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={replace} className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Replace on {usedBy!.length} {usedBy!.length === 1 ? "page" : "pages"}</button>
                    <button type="button" disabled={busy} onClick={() => setCandidate(null)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">Choose another</button>
                  </div>
                </div>
              ) : !progress ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => file.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"><Upload className="size-4" /> Upload new {isVideo ? "video" : "photo"}</button>
                  <button type="button" onClick={() => setPicker(true)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold hover:border-pine"><FolderOpen className="size-4" /> Pick from library</button>
                </div>
              ) : null}
            </section>
          ) : null}

          {msg ? <p role="status" className={cn("rounded-xl px-3 py-2 text-sm", msg.tone === "green" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200")}>{msg.text}</p> : null}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-3">
          {inUse ? <p className="mr-auto flex items-center gap-1.5 text-xs text-muted"><AlertTriangle className="size-3.5" /> In use, so it can't be deleted.</p> : <span className="mr-auto" />}
          <button type="button" disabled={busy || usedBy === null || inUse} onClick={async () => {
            if (!(await stepUp({ purpose: "delete", title: `Delete ${item.src.split("/").pop()} for good`, detail: "Nothing on the website uses it. This can't be undone.", action: "Delete", danger: true }))) return;
            const r = await deleteMediaAction(item.id);
            if (r.ok) onChanged("File deleted."); else { setMsg({ tone: "red", text: r.error }); setUsedBy(r.usedBy ?? usedBy); }
          }} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300"><Trash2 className="size-4" /> Delete</button>
        </div>
      </div>
      {picker ? <div onClick={(e) => e.stopPropagation()}><MediaPicker kind={isVideo ? "video" : "image"} title="Pick the new photo" onClose={() => setPicker(false)} onPick={(items) => { setCandidate(items[0].id === item.id ? null : items[0]); setPicker(false); }} /></div> : null}
    </div>
  );
}
