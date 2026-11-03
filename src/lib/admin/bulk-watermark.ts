import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/admin/db";
import { features } from "@/lib/admin/features";
import { uploadsDir, withWatermark } from "@/lib/admin/media";
import { refreshSite, writeWatermarks } from "@/lib/admin/publish";

/**
 * The logo watermark is shown only where photos are presented as a gallery:
 * the Gallery section of each trip page and the Gallery page (and in the
 * image sitemap and gallery data for Google, so Google Images shows our
 * branded photos). Banners, sliders, trip cards and covers keep the clean
 * original. Each gallery photo gets a watermarked copy; the list of copies is
 * published as watermarks.json. The originals are never changed, so removing
 * the watermark is instant.
 */
export type BulkState = { state: "idle" | "running" | "done" | "undoing" | "failed"; done: number; total: number; changed: number; startedAt?: string; finishedAt?: string; error?: string; map: Record<string, string>; pendingRefresh?: boolean; off?: boolean; skip?: string[] };

const KEY = "bulkWatermark";
const blank = (): BulkState => ({ state: "idle", done: 0, total: 0, changed: 0, map: {} });

export async function bulkStatus(): Promise<BulkState> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  return { ...blank(), ...((row?.value as Partial<BulkState>) ?? {}) };
}
const save = (s: BulkState) => db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: s as object, public: false }, update: { value: s as object } });

/** Pages are refreshed from inside a request (an admin action or the scheduled job). */
export async function refreshIfPending() {
  const s = await bulkStatus();
  if (!s.pendingRefresh) return false;
  await save({ ...s, pendingRefresh: false });
  refreshSite();
  return true;
}

const original = (src: string) => src.split("?")[0];
const isPhoto = (src: unknown): src is string => typeof src === "string" && (src.startsWith("/media/") || (src.startsWith("/uploads/") && !src.startsWith("/uploads/watermarked/")));

/** Photos shown in galleries: trip covers and galleries, and community photos. */
function galleryPhotos(collectionKey: string, data: unknown): string[] {
  const d = (data ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  const one = (im: unknown) => { const src = (im as { src?: unknown })?.src; if (isPhoto(src)) out.push(original(src)); };
  if (collectionKey === "trips") { one(d.cover); if (Array.isArray(d.gallery)) d.gallery.forEach(one); }
  else if (Array.isArray(d.photos)) d.photos.forEach(one);
  return out;
}

async function makeCopy(src: string, wm: { opacity: number; size: number }) {
  const file = src.startsWith("/uploads/") ? path.join(/*turbopackIgnore: true*/ uploadsDir(), src.slice("/uploads/".length)) : path.join(/*turbopackIgnore: true*/ process.cwd(), "public", src);
  const root = src.startsWith("/uploads/") ? uploadsDir() : path.join(process.cwd(), "public", "media");
  if (!path.resolve(file).startsWith(path.resolve(root))) throw new Error("outside");
  const out = await (await withWatermark(sharp(await readFile(file), { failOn: "none" }).rotate(), wm)).webp({ quality: 86, smartSubsample: true }).toBuffer();
  const dir = path.join(/*turbopackIgnore: true*/ uploadsDir(), "watermarked");
  await mkdir(dir, { recursive: true });
  const name = `${createHash("sha1").update(src).digest("hex").slice(0, 12)}-${path.basename(src).replace(/\.[^.]+$/, "")}.webp`;
  await writeFile(path.join(dir, name), out);
  return `/uploads/watermarked/${name}`;
}

/** A newly uploaded photo gets its watermarked copy straight away (or is left out when the tick box was cleared). */
export async function addGalleryCopy(src: string, mark = true) {
  const wm = (await features()).watermark;
  if (!wm.enabled || !isPhoto(src)) return;
  const cur = await bulkStatus();
  if (!mark) { if (!cur.skip?.includes(src)) await save({ ...cur, skip: [...(cur.skip ?? []), src].slice(-2000) }); return; }
  if (cur.map[src] || cur.off) return;
  const copy = await makeCopy(src, wm);
  const fresh = await bulkStatus();
  const map = { ...fresh.map, [src]: copy };
  await save({ ...fresh, map, pendingRefresh: true });
  await writeWatermarks(map);
}

/**
 * Makes the copies for every gallery photo that has none yet. Run by the
 * button, and by the scheduled job so photos added to a gallery later are
 * covered too (unless the watermark was undone).
 */
export async function startBulkWatermark(opts: { auto?: boolean } = {}): Promise<{ ok: boolean; message: string }> {
  const cur = await bulkStatus();
  if (cur.state === "running" || cur.state === "undoing") return { ok: false, message: "Already working on it." };
  const wm = (await features()).watermark;
  if (opts.auto && (!wm.enabled || wm.scope !== "galleries" || cur.off)) return { ok: false, message: "" };
  const skip = new Set(cur.skip ?? []);
  const entries = await db.entry.findMany({ where: { collection: { in: ["trips", "community"] } }, select: { collection: true, data: true, live: true } });
  const photos = [...new Set(entries.flatMap((e) => [...galleryPhotos(e.collection, e.data), ...galleryPhotos(e.collection, e.live)]))].filter((src) => !cur.map[src] && !skip.has(src));
  if (!photos.length) {
    if (!opts.auto) { await writeWatermarks(cur.map); await save({ ...cur, off: false, pendingRefresh: true }); }
    return { ok: false, message: "All gallery photos already have the watermark." };
  }
  const state: BulkState = { ...cur, off: false, state: "running", done: 0, total: photos.length, changed: 0, startedAt: new Date().toISOString(), finishedAt: undefined, error: undefined };
  await save(state);
  void (async () => {
    const made: Record<string, string> = {};
    try {
      for (const src of photos) {
        try { made[src] = await makeCopy(src, wm); } catch { /* unreadable photo: shown without the watermark */ }
        state.done++;
        if (state.done % 10 === 0) await save({ ...state, map: { ...cur.map, ...made } });
      }
      const map = { ...cur.map, ...made };
      await writeWatermarks(map);
      await save({ ...state, state: "done", changed: Object.keys(made).length, map, finishedAt: new Date().toISOString(), pendingRefresh: true });
    } catch (e) {
      await save({ ...state, state: "failed", map: { ...cur.map, ...made }, error: e instanceof Error ? e.message.slice(0, 200) : "failed" });
    }
  })();
  return { ok: true, message: `Started: ${photos.length} photos.` };
}

/** Shows the galleries without the watermark again (the copies are deleted). */
export async function undoBulkWatermark(): Promise<{ ok: boolean; message: string }> {
  const cur = await bulkStatus();
  if (cur.state === "running" || cur.state === "undoing") return { ok: false, message: "Please wait until it has finished." };
  const copies = Object.values(cur.map);
  if (!copies.length) return { ok: false, message: "Nothing to undo." };
  await writeWatermarks({});
  await save({ ...blank(), off: true, skip: cur.skip, finishedAt: new Date().toISOString() });
  for (const copy of copies) await rm(path.join(/*turbopackIgnore: true*/ uploadsDir(), copy.replace(/^\/uploads\//, "")), { force: true }).catch(() => undefined);
  refreshSite();
  return { ok: true, message: `The galleries show the original photos again (${copies.length} photos).` };
}
