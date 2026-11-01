"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Search, Trash2, Upload, X } from "lucide-react";
import { inputClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export type Img = { src: string; w: number; h: number; alt: string };
type Item = { id: string; src: string; width: number; height: number; alt: string; bytes: number; mime: string; folder: string };

const toImg = (m: Item): Img => ({ src: m.src, w: m.width, h: m.height, alt: m.alt });
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** Admin pages are on another host; photos come from the same app, so a relative path works. */
const thumb = (src: string, w = 384) => (src.endsWith(".svg") ? src : `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=70`);

export async function uploadFile(file: File, folder?: string): Promise<Item> {
  const body = new FormData();
  body.set("file", file);
  if (folder) body.set("folder", folder);
  const res = await fetch("/api/media/", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { item?: Item; error?: string };
  if (!res.ok || !json.item) throw new Error(json.error ?? "Upload failed");
  return json.item;
}

export function ImageField({ value, onChange, folder }: { value: Img | null; onChange: (v: Img | null) => void; folder?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {value?.src ? (
        <div className="group relative overflow-hidden rounded-2xl border border-line bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(value.src, 1080)} alt={value.alt} className="aspect-[16/9] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
            <input
              value={value.alt}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              placeholder="Describe the photo (for Google and screen readers)"
              aria-label="Photo description"
              className="min-w-0 flex-1 rounded-lg bg-white/95 px-3 py-1.5 text-sm text-ink focus:outline-none"
            />
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-ink">Change</button>
            <button type="button" onClick={() => onChange(null)} className="rounded-lg bg-white/95 px-2 py-1.5 text-ink" aria-label="Remove photo"><Trash2 className="size-4" /></button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex aspect-[16/9] w-full max-w-xl flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-pine hover:border-pine">
          <ImagePlus className="size-7" /> Choose or upload a photo
        </button>
      )}
      {open ? <MediaPicker folder={folder} onClose={() => setOpen(false)} onPick={(items) => { onChange(toImg(items[0])); setOpen(false); }} /> : null}
    </div>
  );
}

export function GalleryField({ value, onChange, folder }: { value: Img[]; onChange: (v: Img[]) => void; folder?: string }) {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {value.map((img, i) => (
          <li
            key={`${img.src}-${i}`}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
            className={cn("group relative overflow-hidden rounded-xl border border-line bg-black/5", drag === i && "opacity-50")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb(img.src)} alt={img.alt} loading="lazy" className="aspect-[4/3] w-full cursor-grab object-cover" />
            <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 px-1.5 text-xs font-bold text-white">{i + 1}</span>
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <button type="button" onClick={() => move(i, i - 1)} className="grid size-7 place-items-center rounded-md bg-white/95" aria-label="Move earlier"><ArrowLeft className="size-3.5" /></button>
              <button type="button" onClick={() => move(i, i + 1)} className="grid size-7 place-items-center rounded-md bg-white/95" aria-label="Move later"><ArrowRight className="size-3.5" /></button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded-md bg-white/95" aria-label="Remove photo"><X className="size-3.5" /></button>
            </div>
            <input
              value={img.alt}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
              placeholder="Description"
              aria-label={`Description of photo ${i + 1}`}
              className="w-full border-t border-line bg-card px-2 py-1.5 text-xs focus:outline-none"
            />
          </li>
        ))}
        <li>
          <button type="button" onClick={() => setOpen(true)} className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-sm font-semibold text-pine hover:border-pine">
            <ImagePlus className="size-6" /> Add photos
          </button>
        </li>
      </ul>
      {open ? <MediaPicker multiple folder={folder} onClose={() => setOpen(false)} onPick={(items) => { onChange([...value, ...items.map(toImg)]); setOpen(false); }} /> : null}
    </div>
  );
}

/** The media library as a dialog: search, pick, or drop new photos in. */
export function MediaPicker({ onPick, onClose, multiple, folder, kind = "image" }: { onPick: (items: Item[]) => void; onClose: () => void; multiple?: boolean; folder?: string; kind?: "image" | "video" }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Item[]; pages: number; total: number } | null>(null);
  const [picked, setPicked] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/media/?${new URLSearchParams({ q, page: String(page), kind })}`);
    if (res.ok) setData(await res.json());
    else setError("Couldn't load the library. Are you still signed in?");
  }, [q, page, kind]);
  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const upload = async (files: FileList | File[]) => {
    setError(null);
    const list = [...files];
    const done: Item[] = [];
    for (const [i, f] of list.entries()) {
      setBusy(`Uploading ${i + 1} of ${list.length}: ${f.name}`);
      try {
        done.push(await uploadFile(f, folder));
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
    }
    setBusy(null);
    if (done.length) {
      setPicked((p) => (multiple ? [...p, ...done] : done.slice(-1)));
      setPage(1);
      setQ("");
      await load();
    }
  };

  const toggle = (m: Item) => setPicked((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : multiple ? [...p, m] : [m]));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Media library">
      <div
        className={cn("flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:h-[85dvh] sm:rounded-3xl", over && "ring-4 ring-pine")}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) void upload(e.dataTransfer.files); }}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <h2 className="text-lg font-bold">{kind === "video" ? "Videos" : "Photos"}</h2>
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by description or file name…" className={cn(inputClass, "pl-9")} autoFocus />
          </div>
          <input ref={input} type="file" accept={kind === "video" ? "video/mp4,video/webm" : "image/*"} multiple={multiple} hidden onChange={(e) => e.target.files && void upload(e.target.files)} />
          <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine-deep">
            <Upload className="size-4" /> Upload
          </button>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-line" aria-label="Close"><X className="size-4" /></button>
        </div>
        {busy || error ? <p className={cn("px-4 py-2 text-sm", error ? "bg-red-50 text-red-700" : "bg-pine/8 text-pine")}>{busy ?? error}</p> : null}
        <div className="flex-1 overflow-y-auto p-4">
          {!data ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : data.items.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {data.items.map((m) => {
                const on = picked.some((x) => x.id === m.id);
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => toggle(m)} onDoubleClick={() => onPick([m])} className={cn("block w-full overflow-hidden rounded-xl border-2 text-left transition", on ? "border-pine ring-3 ring-pine/25" : "border-transparent hover:border-line")} aria-pressed={on}>
                      {m.mime.startsWith("video/") ? (
                        <video src={m.src} muted preload="metadata" className="aspect-square w-full bg-black object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb(m.src)} alt={m.alt} loading="lazy" className="aspect-square w-full bg-black/5 object-cover" />
                      )}
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
                <p className="mt-2">{q ? "Nothing found." : "No files yet."} Drop files here or press Upload.</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            {data && data.pages > 1 ? (
              <>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-line px-3 py-1 disabled:opacity-40">←</button>
                Page {page} of {data.pages}
                <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-line px-3 py-1 disabled:opacity-40">→</button>
              </>
            ) : (
              <span>Drag files from your computer straight into this window.</span>
            )}
          </div>
          <button type="button" disabled={!picked.length} onClick={() => onPick(picked)} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-40">
            {multiple ? `Add ${picked.length || ""} ${picked.length === 1 ? "photo" : "photos"}` : "Use this"}
          </button>
        </div>
      </div>
    </div>
  );
}
