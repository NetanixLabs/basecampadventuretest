import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { collection } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { features } from "@/lib/admin/features";
import { uploadsDir, withWatermark } from "@/lib/admin/media";
import { refreshSite, writeCollection } from "@/lib/admin/publish";

/**
 * Adds the logo watermark to the photos already in the galleries (trip
 * galleries, day photos and community photos), which were imported before
 * uploads were watermarked. A watermarked copy is made of each photo and the
 * pages switch to the copies; the originals are never changed, so Undo puts
 * them straight back. Runs in the background; progress is kept in a setting.
 */
export type BulkState = { state: "idle" | "running" | "done" | "undoing" | "failed"; done: number; total: number; changed: number; startedAt?: string; finishedAt?: string; error?: string; map: Record<string, string>; pendingRefresh?: boolean };

const KEY = "bulkWatermark";
const COLLECTIONS = ["trips", "community"];
const blank = (): BulkState => ({ state: "idle", done: 0, total: 0, changed: 0, map: {} });

export async function bulkStatus(): Promise<BulkState> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  return { ...blank(), ...((row?.value as Partial<BulkState>) ?? {}) };
}
const save = (s: BulkState) => db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: s as object, public: false }, update: { value: s as object } });

/** Gallery photo addresses used in an entry (only the original imported photos). */
function galleryPhotos(collectionKey: string, data: unknown): string[] {
  const d = (data ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  const take = (list: unknown) => { if (Array.isArray(list)) for (const im of list) { const src = (im as { src?: unknown })?.src; if (typeof src === "string" && src.startsWith("/media/")) out.push(src.split("?")[0]); } };
  if (collectionKey === "trips") {
    take(d.gallery);
    if (Array.isArray(d.itinerary)) for (const day of d.itinerary) take((day as { images?: unknown }).images);
  } else take(d.photos);
  return out;
}

/** Swaps photo addresses inside an entry's JSON (exact address matches only). */
function swap(value: unknown, map: Record<string, string>) {
  if (value == null) return value;
  let s = JSON.stringify(value);
  for (const [from, to] of Object.entries(map)) s = s.split(JSON.stringify(from)).join(JSON.stringify(to));
  return JSON.parse(s);
}

/**
 * Pages are refreshed from inside a request (an admin action or the scheduled
 * job); the background work only marks that a refresh is needed.
 */
export async function refreshIfPending() {
  const s = await bulkStatus();
  if (!s.pendingRefresh) return false;
  await save({ ...s, pendingRefresh: false });
  refreshSite();
  return true;
}

async function applyMap(map: Record<string, string>, inRequest: boolean) {
  let changed = 0;
  for (const c of COLLECTIONS) {
    const def = collection(c);
    if (!def) continue;
    let touched = false;
    for (const e of await db.entry.findMany({ where: { collection: c } })) {
      const data = swap(e.data, map), live = swap(e.live, map);
      if (JSON.stringify(data) !== JSON.stringify(e.data) || JSON.stringify(live) !== JSON.stringify(e.live)) {
        await db.entry.update({ where: { id: e.id }, data: { data, ...(e.live ? { live } : {}) } });
        touched = true;
        changed++;
      }
    }
    if (touched) await writeCollection(def);
  }
  if (inRequest) refreshSite();
  return changed;
}

export async function startBulkWatermark(): Promise<{ ok: boolean; message: string }> {
  const cur = await bulkStatus();
  if (cur.state === "running" || cur.state === "undoing") return { ok: false, message: "Already working on it." };
  const wm = (await features()).watermark;
  const entries = await db.entry.findMany({ where: { collection: { in: COLLECTIONS } }, select: { collection: true, data: true, live: true } });
  const photos = [...new Set(entries.flatMap((e) => [...galleryPhotos(e.collection, e.data), ...galleryPhotos(e.collection, e.live)]))].filter((src) => !cur.map[src]);
  if (!photos.length) return { ok: false, message: "All gallery photos already have the watermark." };
  const state: BulkState = { ...cur, state: "running", done: 0, total: photos.length, changed: 0, startedAt: new Date().toISOString(), finishedAt: undefined, error: undefined };
  await save(state);
  void (async () => {
    const dir = path.join(/*turbopackIgnore: true*/ uploadsDir(), "watermarked");
    await mkdir(dir, { recursive: true });
    const made: Record<string, string> = {};
    try {
      for (const src of photos) {
        try {
          const file = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", src);
          if (!file.startsWith(path.join(process.cwd(), "public", "media"))) continue;
          const out = await (await withWatermark(sharp(await readFile(file), { failOn: "none" }).rotate(), wm)).webp({ quality: 86, smartSubsample: true }).toBuffer();
          const name = `${createHash("sha1").update(src).digest("hex").slice(0, 12)}-${path.basename(src).replace(/\.[^.]+$/, "")}.webp`;
          await writeFile(path.join(dir, name), out);
          made[src] = `/uploads/watermarked/${name}`;
        } catch {
          /* unreadable photo: left as it is */
        }
        state.done++;
        if (state.done % 10 === 0) await save({ ...state, map: { ...cur.map, ...made } });
      }
      state.changed = await applyMap(made, false);
      await save({ ...state, state: "done", map: { ...cur.map, ...made }, finishedAt: new Date().toISOString(), pendingRefresh: true });
    } catch (e) {
      await save({ ...state, state: "failed", map: { ...cur.map, ...made }, error: e instanceof Error ? e.message.slice(0, 200) : "failed" });
    }
  })();
  return { ok: true, message: `Started: ${photos.length} photos.` };
}

export async function undoBulkWatermark(): Promise<{ ok: boolean; message: string }> {
  const cur = await bulkStatus();
  if (cur.state === "running" || cur.state === "undoing") return { ok: false, message: "Please wait until it has finished." };
  const reverse = Object.fromEntries(Object.entries(cur.map).map(([a, b]) => [b, a]));
  if (!Object.keys(reverse).length) return { ok: false, message: "Nothing to undo." };
  await save({ ...cur, state: "undoing" });
  const changed = await applyMap(reverse, true);
  for (const copy of Object.keys(reverse)) await rm(path.join(/*turbopackIgnore: true*/ uploadsDir(), copy.replace(/^\/uploads\//, "")), { force: true }).catch(() => undefined);
  await save({ ...blank(), finishedAt: new Date().toISOString() });
  return { ok: true, message: `Original photos are back on ${changed} pages.` };
}
