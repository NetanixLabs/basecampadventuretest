"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, FolderOpen, ImagePlus, Loader2, RefreshCw, Search, Star, Trash2, Upload, X } from "lucide-react";
import { inputClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export type Img = { src: string; w: number; h: number; alt: string };
export type Item = {
  id: string; src: string; width: number; height: number; alt: string; bytes: number; mime: string; folder: string;
  originalName?: string; createdAt?: string; unused?: boolean; weakAlt?: boolean;
};

const toImg = (m: Item): Img => ({ src: m.src, w: m.width, h: m.height, alt: m.alt });
export const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** Widths the image optimiser accepts (next.config.ts: imageSizes + deviceSizes). */
const WIDTHS = [96, 256, 384, 640, 828, 1200, 1920];
/** Admin pages are on another host; photos come from the same app, so a relative path works. */
export const thumb = (src: string, w = 384) => {
  if (src.endsWith(".svg") || src.startsWith("blob:")) return src;
  const width = WIDTHS.find((x) => x >= w) ?? 1920;
  return `/_next/image/?url=${encodeURIComponent(src)}&w=${width}&q=75`;
};

export type Progress = { name: string; index: number; count: number; percent: number };

/** Uploads one file, reporting progress (photos can be large on a slow connection). */
export function uploadFile(file: File, folder?: string, watermark?: boolean, onProgress?: (percent: number) => void): Promise<Item> {
  const body = new FormData();
  body.set("file", file);
  if (folder) body.set("folder", folder);
  if (watermark !== undefined) body.set("watermark", watermark ? "1" : "0");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => reject(new Error("The connection dropped. Please try again."));
    xhr.onload = () => {
      let json: { item?: Item; error?: string } = {};
      try { json = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && json.item) resolve(json.item);
      else reject(new Error(json.error ?? (xhr.status === 413 ? "That file is too big." : "Upload failed")));
    };
    xhr.send(body);
  });
}

/** Uploads several files one after another; returns the ones that worked and the errors. */
export async function uploadMany(files: File[], opts: { folder?: string; watermark?: boolean; onProgress?: (p: Progress | null) => void }) {
  const done: Item[] = [];
  const errors: string[] = [];
  for (const [i, f] of files.entries()) {
    opts.onProgress?.({ name: f.name, index: i + 1, count: files.length, percent: 0 });
    try {
      done.push(await uploadFile(f, opts.folder, opts.watermark, (percent) => opts.onProgress?.({ name: f.name, index: i + 1, count: files.length, percent })));
    } catch (e) {
      errors.push(`${f.name}: ${(e as Error).message}`);
    }
  }
  opts.onProgress?.(null);
  return { done, errors };
}

const imagesOnly = (files: FileList | File[]) => [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif|avif)$/i.test(f.name));
const hasFiles = (e: React.DragEvent) => [...e.dataTransfer.types].includes("Files");

/** The watermark rule, read once per page from the library. */
let wmCache: Promise<{ enabled: boolean; scope: string } | null> | null = null;
function useWatermark(gallery: boolean) {
  const [rule, setRule] = useState<{ enabled: boolean; scope: string } | null>(null);
  useEffect(() => {
    wmCache ??= fetch("/api/media/?per=12").then((r) => (r.ok ? r.json() : null)).then((j) => j?.watermark ?? null).catch(() => null);
    void wmCache.then(setRule);
  }, []);
  return rule?.enabled ? (gallery || rule.scope === "all") : undefined;
}

export function UploadBar({ progress }: { progress: Progress }) {
  return (
    <div className="rounded-xl bg-pine/8 px-3 py-2 text-sm text-pine" role="status">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 font-medium"><Loader2 className="size-4 shrink-0 animate-spin" /><span className="truncate">Uploading {progress.count > 1 ? `${progress.index} of ${progress.count}: ` : ""}{progress.name}</span></span>
        <span className="tabular-nums">{progress.percent < 100 ? `${progress.percent}%` : "Optimising…"}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-pine/15"><div className="h-full rounded-full bg-pine transition-[width]" style={{ width: `${progress.percent}%` }} /></div>
    </div>
  );
}

function Problem({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200" role="alert">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" /><span className="flex-1">{children}</span>
      {onClose ? <button type="button" onClick={onClose} aria-label="Dismiss"><X className="size-4" /></button> : null}
    </p>
  );
}

/* --------------------------------------------------------------- one photo */

export function ImageField({ value, onChange, folder, minWidth = 0 }: { value: Img | null; onChange: (v: Img | null) => void; folder?: string; minWidth?: number }) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const watermark = useWatermark(false);

  const upload = async (files: FileList | File[]) => {
    const list = imagesOnly(files).slice(0, 1);
    if (!list.length) return setError("That isn't a photo. Use JPG, PNG, WebP or HEIC.");
    setError(null);
    const { done, errors } = await uploadMany(list, { folder, watermark, onProgress: setProgress });
    if (done[0]) onChange({ ...toImg(done[0]), alt: value?.alt || done[0].alt });
    if (errors.length) setError(errors.join(" "));
  };

  const small = value?.src && minWidth && value.w && value.w < minWidth;
  const portrait = value?.w && value?.h ? value.h > value.w : false;

  return (
    <div
      onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); setOver(false); void upload(e.dataTransfer.files); }}
      className="space-y-2.5"
    >
      <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = ""; }} />
      {value?.src ? (
        <div className={cn("overflow-hidden rounded-2xl border bg-card transition", over ? "border-pine ring-4 ring-pine/20" : "border-line")}>
          <div className="relative grid place-items-center bg-black/[0.04] dark:bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb(value.src, 1200)} alt={value.alt} className={cn("max-h-[22rem] w-auto max-w-full object-contain", portrait ? "h-[22rem]" : "")} />
            {over || progress ? (
              <div className="absolute inset-0 grid place-items-center bg-pine/75 p-6 text-center text-white backdrop-blur-sm">
                {progress ? <div className="w-full max-w-sm"><UploadBar progress={progress} /></div> : <p className="flex items-center gap-2 text-base font-semibold"><RefreshCw className="size-5" /> Drop to replace this photo</p>}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
            <p className="mr-auto min-w-0 truncate text-xs text-muted" title={value.src}>
              {value.w ? <span className="font-semibold text-ink-soft">{value.w} × {value.h} px</span> : null}
              <span className="ml-2 font-mono">{value.src.split("/").pop()}</span>
            </p>
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-pine hover:text-pine"><FolderOpen className="size-3.5" /> Replace from library</button>
            <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-pine hover:text-pine"><Upload className="size-3.5" /> Upload new</button>
            <button type="button" onClick={() => { if (confirm("Remove this photo from here? It stays in the media library.")) onChange(null); }} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-300 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"><Trash2 className="size-3.5" /> Remove</button>
          </div>
          {small ? (
            <p className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="size-3.5 shrink-0" /> This photo is {value.w} px wide. Here it can look blurry on big screens; at least {minWidth} px is best.
            </p>
          ) : null}
          <div className="border-t border-line px-3 py-2.5">
            <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor={`alt-${value.src}`}>Photo description</label>
            <input
              id={`alt-${value.src}`}
              value={value.alt}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              placeholder="e.g. Trekkers crossing a suspension bridge near Namche Bazaar"
              className={cn(inputClass, "py-2", !value.alt.trim() && "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20")}
            />
            <p className="mt-1 text-[11px] text-muted">For Google and for visitors who can't see the photo.</p>
          </div>
        </div>
      ) : (
        <div className={cn("flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition", over ? "border-pine bg-pine/5" : "border-line")}>
          {progress ? <div className="w-full max-w-sm"><UploadBar progress={progress} /></div> : (
            <>
              <ImagePlus className="size-8 text-pine" />
              <p className="text-sm font-semibold">{over ? "Drop the photo to upload it" : "Drag a photo here from your computer"}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine-deep"><Upload className="size-4" /> Upload</button>
                <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine hover:text-pine"><FolderOpen className="size-4" /> Choose from library</button>
              </div>
              {minWidth ? <p className="text-xs text-muted">Best at least {minWidth} px wide.</p> : null}
            </>
          )}
        </div>
      )}
      {error ? <Problem onClose={() => setError(null)}>{error}</Problem> : null}
      {open ? <MediaPicker title={value?.src ? "Replace photo" : "Choose a photo"} folder={folder} onClose={() => setOpen(false)} onPick={(items) => { onChange({ ...toImg(items[0]), alt: items[0].alt || value?.alt || "" }); setOpen(false); }} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------ many photos */

export function GalleryField({ value, onChange, folder }: { value: Img[]; onChange: (v: Img[]) => void; folder?: string }) {
  const [picker, setPicker] = useState<{ replace: number | null } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const watermark = useWatermark(true);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  const upload = async (files: FileList | File[]) => {
    const list = imagesOnly(files);
    if (!list.length) return setError("Those files aren't photos. Use JPG, PNG, WebP or HEIC.");
    setError(null);
    const { done, errors } = await uploadMany(list, { folder, watermark, onProgress: setProgress });
    if (done.length) onChange([...value, ...done.map(toImg)]);
    if (errors.length) setError(errors.join(" "));
  };
  const missing = value.filter((x) => !x.alt.trim()).length;

  return (
    <div
      onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); setOver(false); void upload(e.dataTransfer.files); }}
      className={cn("rounded-2xl transition", over && "bg-pine/5 ring-4 ring-pine/20")}
    >
      <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = ""; }} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-xs text-muted">
          <span className="font-semibold text-ink-soft">{value.length} {value.length === 1 ? "photo" : "photos"}</span>
          {missing ? <span className="ml-2 text-amber-700 dark:text-amber-300">· {missing} without a description</span> : null}
          {value.length > 1 ? <span className="ml-2 hidden sm:inline">· drag to change the order</span> : null}
        </p>
        <button type="button" onClick={() => setPicker({ replace: null })} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-pine hover:text-pine"><FolderOpen className="size-3.5" /> Add from library</button>
        <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-pine px-3 py-1.5 text-xs font-semibold text-white hover:bg-pine-deep"><Upload className="size-3.5" /> Upload photos</button>
        {value.length > 1 ? (
          <button type="button" onClick={() => { if (confirm(`Remove all ${value.length} photos from this gallery? They stay in the media library.`)) onChange([]); }} className="rounded-full px-2 py-1.5 text-xs font-semibold text-muted hover:text-red-700">Remove all</button>
        ) : null}
      </div>
      {progress ? <div className="mb-3"><UploadBar progress={progress} /></div> : null}
      {error ? <div className="mb-3"><Problem onClose={() => setError(null)}>{error}</Problem></div> : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {value.map((img, i) => (
          <li
            key={`${img.src}-${i}`}
            draggable
            onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={() => { setDrag(null); setTarget(null); }}
            onDragOver={(e) => { if (drag !== null) { e.preventDefault(); setTarget(i); } }}
            onDrop={(e) => { if (drag === null) return; e.preventDefault(); e.stopPropagation(); move(drag, i); setDrag(null); setTarget(null); }}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card transition",
              drag === i ? "scale-95 opacity-40" : "",
              target === i && drag !== i ? "border-pine ring-3 ring-pine/30" : "border-line",
            )}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(img.src)} alt={img.alt} loading="lazy" draggable={false} className="aspect-[4/3] w-full cursor-grab bg-black/5 object-cover active:cursor-grabbing" />
              <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {i === 0 ? <Star className="size-3 fill-current" /> : null}{i + 1}
              </span>
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <span className="flex gap-1">
                  <IconBtn label="Move earlier" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowLeft className="size-3.5" /></IconBtn>
                  <IconBtn label="Move later" disabled={i === value.length - 1} onClick={() => move(i, i + 1)}><ArrowRight className="size-3.5" /></IconBtn>
                  {i > 0 ? <IconBtn label="Show first" onClick={() => move(i, 0)}><Star className="size-3.5" /></IconBtn> : null}
                </span>
                <span className="flex gap-1">
                  <IconBtn label="Replace this photo" onClick={() => setPicker({ replace: i })}><RefreshCw className="size-3.5" /></IconBtn>
                  <IconBtn label="Remove photo" danger onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="size-3.5" /></IconBtn>
                </span>
              </div>
            </div>
            <input
              value={img.alt}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
              placeholder="Add a description…"
              aria-label={`Description of photo ${i + 1}`}
              className={cn("w-full border-t border-line bg-card px-2 py-1.5 text-xs focus:bg-pine/5 focus:outline-none", !img.alt.trim() && "bg-amber-50/70 placeholder:text-amber-700 dark:bg-amber-950/30 dark:placeholder:text-amber-300")}
            />
          </li>
        ))}
        <li>
          <button type="button" onClick={() => input.current?.click()} className={cn("flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3 text-center text-sm font-semibold text-pine transition hover:border-pine hover:bg-pine/5", over ? "border-pine bg-pine/5" : "border-line")}>
            <ImagePlus className="size-6" />
            {over ? "Drop to add" : "Add photos"}
            <span className="text-[11px] font-normal text-muted">or drag them in from your computer</span>
          </button>
        </li>
      </ul>
      {picker ? (
        <MediaPicker
          multiple={picker.replace === null}
          gallery
          folder={folder}
          title={picker.replace === null ? "Add photos" : `Replace photo ${picker.replace + 1}`}
          onClose={() => setPicker(null)}
          onPick={(items) => {
            if (picker.replace === null) onChange([...value, ...items.map(toImg)]);
            else onChange(value.map((x, j) => (j === picker.replace ? { ...toImg(items[0]), alt: items[0].alt || x.alt } : x)));
            setPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={cn("grid size-7 place-items-center rounded-md bg-white/95 text-ink shadow-sm transition hover:bg-white disabled:opacity-30", danger ? "hover:text-red-700" : "hover:text-pine")}>
      {children}
    </button>
  );
}

/* ----------------------------------------------- a path to a photo (text) */

/** For fields that hold just the photo's address (packing list pictures, award badges). */
export function ImagePathField({ id, value, onChange, folder }: { id: string; value: string; onChange: (v: string) => void; folder?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-black/5">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb(value, 96)} alt="" className="size-full object-contain" />
        ) : <ImagePlus className="size-5 text-muted" />}
      </div>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/media/…" className={cn(inputClass, "font-mono text-[13px]")} />
      <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-full border border-line px-3 py-2 text-xs font-semibold hover:border-pine hover:text-pine">{value ? "Change" : "Choose"}</button>
      {value ? <button type="button" onClick={() => onChange("")} className="shrink-0 text-muted hover:text-red-700" aria-label="Clear"><X className="size-4" /></button> : null}
      {open ? <MediaPicker folder={folder} onClose={() => setOpen(false)} onPick={(items) => { onChange(items[0].src); setOpen(false); }} /> : null}
    </div>
  );
}

/* ---------------------------------------------------------- library dialog */

type Folder = { name: string; count: number };

/** The media library as a dialog: search, filter, pick, or drop new photos in. */
export function MediaPicker({ onPick, onClose, multiple, folder, kind = "image", gallery = false, title }: { onPick: (items: Item[]) => void; onClose: () => void; multiple?: boolean; folder?: string; kind?: "image" | "video"; gallery?: boolean; title?: string }) {
  const [q, setQ] = useState("");
  const [inFolder, setInFolder] = useState("");
  const [sort, setSort] = useState("new");
  const [wmRule, setWmRule] = useState<{ enabled: boolean; scope: string } | null>(null);
  const [wmChoice, setWmChoice] = useState<boolean | null>(null);
  const watermark = wmChoice ?? Boolean(wmRule?.enabled && (gallery || wmRule.scope === "all"));
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Item[]; pages: number; total: number; folders: Folder[] } | null>(null);
  const [picked, setPicked] = useState<Item[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/media/?${new URLSearchParams({ q, page: String(page), kind, folder: inFolder, sort })}`);
    if (res.ok) { const j = await res.json(); setData(j); if (j.watermark) setWmRule(j.watermark); }
    else setError("Couldn't load the library. Are you still signed in?");
  }, [q, page, kind, inFolder, sort]);
  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = overflow; };
  }, [onClose]);

  const upload = async (files: FileList | File[]) => {
    setError(null);
    const list = kind === "image" ? imagesOnly(files) : [...files];
    if (!list.length) return setError("Those files aren't photos.");
    const { done, errors } = await uploadMany(multiple ? list : list.slice(0, 1), { folder, watermark: kind === "image" && wmRule?.enabled ? watermark : undefined, onProgress: setProgress });
    if (errors.length) setError(errors.join(" "));
    if (done.length) {
      setPicked((p) => (multiple ? [...p, ...done] : done.slice(-1)));
      setPage(1);
      setQ("");
      setInFolder("");
      setSort("new");
      await load();
    }
  };

  const toggle = (m: Item) => setPicked((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : multiple ? [...p, m] : [m]));
  const noun = kind === "video" ? "video" : "photo";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title ?? "Media library"} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("flex h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:h-[88dvh] sm:rounded-3xl", over && "ring-4 ring-pine")}
        onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); setOver(true); } }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
        onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); setOver(false); void upload(e.dataTransfer.files); }}
      >
        <div className="border-b border-line p-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display mr-auto text-lg font-bold">{title ?? (kind === "video" ? "Videos" : "Photos")}</h2>
            <input ref={input} type="file" accept={kind === "video" ? "video/mp4,video/webm" : "image/*,.heic,.heif"} multiple={multiple} hidden onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = ""; }} />
            {kind === "image" && wmRule?.enabled ? (
              <label className="hidden items-center gap-2 text-sm font-semibold sm:flex" title="Adds our logo, bottom right, to photos you upload now">
                <input type="checkbox" checked={watermark} onChange={(e) => setWmChoice(e.target.checked)} className="size-4 accent-[var(--pine)]" /> Logo watermark
              </label>
            ) : null}
            <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine-deep">
              <Upload className="size-4" /> Upload {multiple ? `${noun}s` : `a ${noun}`}
            </button>
            <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-line hover:border-pine" aria-label="Close"><X className="size-4" /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by description or file name…" className={cn(inputClass, "rounded-full py-2 pl-9")} autoFocus />
            </div>
            <select value={inFolder} onChange={(e) => { setInFolder(e.target.value); setPage(1); }} className={cn(inputClass, "w-auto rounded-full py-2")} aria-label="Folder">
              <option value="">All folders</option>
              {data?.folders.map((f) => <option key={f.name} value={f.name}>{f.name} ({f.count})</option>)}
            </select>
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className={cn(inputClass, "w-auto rounded-full py-2")} aria-label="Sort">
              <option value="new">Newest first</option>
              <option value="old">Oldest first</option>
              <option value="name">By name</option>
              <option value="big">Largest files</option>
            </select>
          </div>
        </div>
        {progress ? <div className="px-4 pt-3"><UploadBar progress={progress} /></div> : null}
        {error ? <div className="px-4 pt-3"><Problem onClose={() => setError(null)}>{error}</Problem></div> : null}
        <div className="flex-1 overflow-y-auto p-4">
          {!data ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <li key={i} className="aspect-square animate-pulse rounded-xl bg-line/60" />)}</ul>
          ) : data.items.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {data.items.map((m) => {
                const at = picked.findIndex((x) => x.id === m.id);
                const on = at >= 0;
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => toggle(m)} onDoubleClick={() => onPick([m])} className={cn("relative block w-full overflow-hidden rounded-xl border-2 text-left transition", on ? "border-pine ring-3 ring-pine/25" : "border-transparent hover:border-line")} aria-pressed={on}>
                      {m.mime.startsWith("video/") ? (
                        <video src={m.src} muted preload="metadata" className="aspect-square w-full bg-black object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb(m.src)} alt={m.alt} loading="lazy" className="aspect-square w-full bg-black/5 object-cover" />
                      )}
                      {on ? <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-pine text-xs font-bold text-white shadow">{multiple ? at + 1 : <Check className="size-3.5" />}</span> : null}
                      <span className="block truncate px-1.5 pt-1 text-xs font-medium">{m.alt || m.src.split("/").pop()}</span>
                      <span className="block px-1.5 pb-1 text-[11px] text-muted">{m.width ? `${m.width}×${m.height} · ` : ""}{kb(m.bytes)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="grid h-full place-items-center text-center text-sm text-muted">
              <div>
                <Upload className="mx-auto size-8" />
                <p className="mt-2">{q || inFolder ? "Nothing found." : "No files yet."} Drop files here or press Upload.</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            {data && data.pages > 1 ? (
              <>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-line px-3 py-1 disabled:opacity-40" aria-label="Previous page">←</button>
                <span className="tabular-nums">Page {page} of {data.pages}</span>
                <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-line px-3 py-1 disabled:opacity-40" aria-label="Next page">→</button>
                <span className="hidden sm:inline">· {data.total.toLocaleString()} {noun}s</span>
              </>
            ) : (
              <span>Drag files from your computer straight into this window.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {picked.length ? <button type="button" onClick={() => setPicked([])} className="text-sm font-semibold text-muted hover:text-ink">Clear ({picked.length})</button> : null}
            <button type="button" disabled={!picked.length} onClick={() => onPick(picked)} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-40">
              {multiple ? `Add ${picked.length || ""} ${picked.length === 1 ? noun : `${noun}s`}` : `Use this ${noun}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
