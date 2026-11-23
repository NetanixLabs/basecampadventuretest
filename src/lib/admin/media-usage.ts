import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import { COLLECTIONS, collection, singleton } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { contentDir, refreshSite, writeCollection, writeSettings, writeSingleton } from "@/lib/admin/publish";

/**
 * Where photos are used, and swapping one photo for another everywhere.
 *
 * A photo can sit in a trip, a blog post, a page, a homepage list, the menu,
 * a setting, or in the website's own design (the code). Nothing is deleted
 * while it's in use, and "Replace everywhere" updates every place at once.
 */

export type Use = { label: string; where: string; href: string | null };

const PATH_RE = /\/(?:uploads|media|photos|equipment|brand|videos)\/[^"'\s)<>\\?#]+/g;

/** Files the website derives from another photo's name, e.g. "x-thumb.webp" for "x.webp". */
const THUMB_OF = /(\.(?:webp|jpe?g|png))$/;
const THUMB = /-thumb(\.(?:webp|jpe?g|png))$/;

/** "/media/x.webp?v=2" → "/media/x.webp", so a reference and a library path compare equal. */
const bare = (src: string) => src.split(/[?#]/)[0];

/**
 * Text the website itself reads: its code, the published content, and those
 * imported content files (src/content) that nothing has been published over
 * yet. That mirrors how src/lib/content.ts picks a file.
 */
/**
 * Lists of every imported file, kept so old WordPress image addresses keep
 * working. They don't show a photo anywhere, and deleting from the library
 * never removes an imported file from disk, so those addresses stay valid.
 */
const NOT_USES = new Set(["media-files.json", "media-redirects.json"]);

async function codeText(): Promise<string> {
  const src = path.join(/*turbopackIgnore: true*/ process.cwd(), "src");
  const repoContent = path.join(src, "content");
  const live = contentDir();
  const published = new Set(await readdir(live).catch(() => [] as string[]));
  const parts: string[] = [];
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 8) return;
    const items = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const it of items) {
      if (it.name.startsWith(".") || it.name === "generated" || it.name === "node_modules") continue;
      const full = path.join(dir, it.name);
      if (it.isDirectory()) await walk(full, depth + 1);
      else if (!/\.(tsx?|json|css|mdx?)$/.test(it.name)) continue;
      else if (dir === repoContent && it.name.endsWith(".json") && published.has(it.name)) continue; // superseded by the published copy
      else if (NOT_USES.has(it.name)) continue;
      else parts.push(await readFile(full, "utf8").catch(() => ""));
    }
  };
  await walk(src, 0);
  await walk(live, 0);
  return parts.join("\n");
}

let cache: { at: number; refs: Set<string> } | null = null;

/** Every photo path used anywhere: content, drafts, settings and the website's code. Cached for a minute. */
export async function referencedSources(fresh = false): Promise<Set<string>> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.refs;
  const refs = new Set<string>();
  const add = (text: string) => { for (const m of text.matchAll(PATH_RE)) refs.add(bare(m[0])); };
  const entries = await db.$queryRaw<{ t: string }[]>`SELECT data::text || coalesce(live::text, '') AS t FROM "Entry"`;
  entries.forEach((e) => add(e.t));
  const settings = await db.$queryRaw<{ t: string }[]>`SELECT value::text AS t FROM "Setting"`;
  settings.forEach((s) => add(s.t));
  add(await codeText());
  // The packing list shows "<photo>-thumb.webp" next to each item (components/trip/equipment.tsx).
  for (const r of [...refs]) refs.add(r.replace(THUMB_OF, "-thumb$1"));
  cache = { at: Date.now(), refs };
  return refs;
}

export const forgetUsage = () => { cache = null; };

/** The places one photo is used, with a link to edit each one. */
export async function whereUsed(src: string): Promise<Use[]> {
  if (THUMB.test(src)) {
    // A small preview is used wherever its full-size photo is; it changes with that photo, not on its own.
    const full = await whereUsed(src.replace(THUMB, "$1"));
    return full.map((u) => ({ label: u.label, where: `Small preview of ${src.replace(THUMB, "$1").split("/").pop()} · ${u.where}`, href: null }));
  }
  const like = `%${bare(src)}%`;
  const rows = await db.$queryRaw<{ id: string; title: string; collection: string; status: string }[]>`
    SELECT id, title, collection, status::text AS status FROM "Entry"
    WHERE data::text LIKE ${like} OR live::text LIKE ${like}
    ORDER BY collection, title LIMIT 200`;
  const docs = await db.$queryRaw<{ key: string }[]>`SELECT key FROM "Setting" WHERE value::text LIKE ${like} ORDER BY key LIMIT 50`;
  const uses: Use[] = rows.map((r) => ({
    label: r.title || "(untitled)",
    where: `${collection(r.collection)?.singular ?? r.collection}${r.status === "published" ? "" : ` · ${r.status}`}`,
    href: `/c/${r.collection}/${r.id}`,
  }));
  for (const d of docs) {
    const key = d.key.replace(/^doc:/, "");
    const s = d.key.startsWith("doc:") ? singleton(key) : null;
    uses.push({ label: s?.label ?? key, where: s ? "Website section" : "Setting", href: s ? `/singles/${key}` : null });
  }
  if (!uses.length && (await codeText()).includes(bare(src))) {
    uses.push({ label: "The website's design", where: "Built into a page layout; a developer can change it", href: null });
  }
  return uses;
}

type NewImage = { src: string; width: number; height: number };

/**
 * Swaps `from` for `to` in a piece of content: photo fields ({ src, w, h })
 * get the new address and size; text and HTML get the new address.
 */
function swap(value: unknown, from: string, to: NewImage): unknown {
  if (typeof value === "string") return value.includes(from) ? value.split(from).join(to.src) : value;
  if (Array.isArray(value)) return value.map((v) => swap(v, from, to));
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) out[k] = swap(v, from, to);
    if (typeof o.src === "string" && bare(o.src) === from && to.width) {
      if ("w" in o) { out.w = to.width; out.h = to.height; }
      if ("width" in o) { out.width = to.width; out.height = to.height; }
    }
    return out;
  }
  return value;
}

/**
 * Replaces one photo with another on every page, draft and setting, and puts
 * the change live straight away. Unpublished edits stay unpublished: only the
 * photo changes in the live version. Each changed item keeps a version from
 * before, so it can be brought back from its history.
 */
export async function replaceEverywhere(userId: string, fromSrc: string, to: NewImage) {
  const from = bare(fromSrc);
  if (from === to.src) return { entries: 0, sections: 0 };
  const like = `%${from}%`;
  const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Entry" WHERE data::text LIKE ${like} OR live::text LIKE ${like}`;
  const touched = new Set<string>();
  for (const { id } of rows) {
    const e = await db.entry.findUnique({ where: { id } });
    if (!e) continue;
    const data = swap(e.data, from, to) as Prisma.InputJsonValue;
    const live = e.live ? (swap(e.live, from, to) as Prisma.InputJsonValue) : undefined;
    await db.revision.create({ data: { entryId: e.id, data: e.data as Prisma.InputJsonValue, userId, note: "Before a photo was replaced" } });
    await db.entry.update({ where: { id }, data: { data, ...(live !== undefined ? { live } : {}) } });
    await db.revision.create({ data: { entryId: e.id, data, userId, note: "Photo replaced everywhere" } });
    if (e.status === "published") touched.add(e.collection);
  }
  const docs = await db.$queryRaw<{ key: string }[]>`SELECT key FROM "Setting" WHERE value::text LIKE ${like}`;
  let settingsChanged = false;
  for (const { key } of docs) {
    const row = await db.setting.findUnique({ where: { key } });
    if (!row) continue;
    await db.setting.update({ where: { key }, data: { value: swap(row.value, from, to) as Prisma.InputJsonValue } });
    if (key.startsWith("doc:")) await writeSingleton(key.slice(4));
    else if (row.public) settingsChanged = true;
  }
  // Rewrite what the website reads, once per file.
  const written = new Set<string>();
  for (const key of touched) {
    const def = COLLECTIONS.find((c) => c.key === key);
    if (!def || written.has(def.file)) continue;
    written.add(def.file);
    await writeCollection(def);
  }
  if (settingsChanged) await writeSettings();
  forgetUsage();
  refreshSite();
  return { entries: rows.length, sections: docs.length };
}

