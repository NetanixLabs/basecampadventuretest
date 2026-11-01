import "server-only";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/admin/db";
import { COLLECTIONS, SINGLETON_WRAP, SINGLETONS, TAXONOMY_KEYS, type CollectionDef } from "@/lib/admin/collections";

/**
 * Publishing.
 *
 * The database holds every draft and every version. When something is
 * published, the files the website reads are rewritten from the database
 * and the website's cached pages are refreshed. Visitors never wait on the
 * database, and if it is down the site keeps serving the last published
 * version.
 */
export const contentDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.CONTENT_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".storage", "content"));

async function writeJson(name: string, value: unknown) {
  const dir = contentDir();
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${name}.json`);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(value), "utf8");
  await rename(tmp, file); // atomic: readers see the old file or the new one, never half
}

async function liveOf(key: string) {
  const rows = await db.entry.findMany({ where: { collection: key, status: "published" }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }], select: { live: true } });
  return rows.map((r) => r.live).filter(Boolean) as Record<string, unknown>[];
}

/** Rewrites the file(s) one collection publishes into. */
export async function writeCollection(def: CollectionDef) {
  if (def.file === "taxonomies") {
    const all = Object.fromEntries(await Promise.all(TAXONOMY_KEYS.map(async (k) => [k, await liveOf(k)] as const)));
    await writeJson("taxonomies", all);
    return;
  }
  const items = await liveOf(def.key);
  if (def.key === "trips") {
    // The packing list is edited with the trip but read from its own file.
    const equipment: Record<string, { items: unknown[] }> = {};
    const travellers: Record<string, unknown[]> = {};
    const trips = items.map(({ equipment: eq, travellerPhotos: tp, ...t }) => {
      if (Array.isArray(eq) && eq.length) equipment[String(t.slug)] = { items: eq };
      // Traveller photos are read from their own file as { src, w, h, alt, traveller, date }.
      if (Array.isArray(tp) && tp.length) {
        travellers[String(t.slug)] = (tp as { photo?: Record<string, unknown> | null; traveller?: string; date?: string | null }[])
          .filter((x) => x.photo?.src)
          .map((x) => ({ ...x.photo, alt: x.photo?.alt || `Photo from ${x.traveller ?? "a traveller"}`, traveller: x.traveller ?? "", date: x.date ?? null }));
      }
      return t;
    });
    await writeJson("trips", trips);
    await writeJson("equipment", equipment);
    await writeJson("traveller-photos", travellers);
    await writeJson("itinerary-extras", {}); // now part of each trip
    return;
  }
  await writeJson(def.file, items);
}

export async function writeSingleton(key: string) {
  const def = SINGLETONS.find((s) => s.key === key);
  if (!def) return;
  const row = await db.setting.findUnique({ where: { key: `doc:${key}` } });
  if (!row) return;
  const wrap = SINGLETON_WRAP[key];
  const value = wrap ? (row.value as Record<string, unknown>)[wrap] : row.value;
  await writeJson(def.file, value);
}

export async function writeRedirects() {
  const rows = await db.redirect.findMany({ select: { from: true, to: true, permanent: true } });
  await writeJson("redirects", rows);
}

/** Public settings the site reads (chat widget, analytics, contact details). */
export async function writeSettings() {
  const rows = await db.setting.findMany({ where: { public: true, NOT: { key: { startsWith: "doc:" } } } });
  await writeJson("settings", Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

/** Refreshes every cached page. Pages re-render on their next visit, in milliseconds. */
export function refreshSite() {
  revalidatePath("/", "layout");
}

/** Rebuilds every file from the database (after an import, or to repair). */
export async function publishEverything() {
  const seen = new Set<string>();
  for (const def of COLLECTIONS) {
    const id = def.file === "taxonomies" ? "taxonomies" : def.key;
    if (seen.has(id)) continue;
    seen.add(id);
    await writeCollection(def);
  }
  for (const s of SINGLETONS) await writeSingleton(s.key);
  await writeRedirects();
  await writeSettings();
}
