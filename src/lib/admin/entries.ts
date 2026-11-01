import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/admin/audit";
import { collection, type CollectionDef, type Field } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { cleanHtml, plain, readingMinutes, slugify } from "@/lib/admin/html";
import { getPath, setPath } from "@/lib/admin/paths";
import { refreshSite, writeCollection, writeRedirects } from "@/lib/admin/publish";

type Data = Record<string, unknown>;

export class InputError extends Error {}

/* -------------------------------------------------------- normalisation */

function normaliseValue(field: Field, value: unknown): unknown {
  switch (field.type) {
    case "number": {
      if (value === "" || value === null || value === undefined) return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case "toggle":
      return Boolean(value);
    case "date":
      return typeof value === "string" && value ? value.slice(0, 10) : null;
    case "text":
    case "textarea":
      return typeof value === "string" ? value.trim() : value ?? "";
    case "richtext":
      return cleanHtml(typeof value === "string" ? value : "").html;
    case "strings":
      return Array.isArray(value) ? value.map((s) => String(s).trim()).filter(Boolean) : [];
    case "multiselect":
      return Array.isArray(value) ? [...new Set(value.map(String))] : [];
    case "gallery":
      return Array.isArray(value) ? value.filter((i) => i && typeof i === "object" && (i as Data).src) : [];
    case "image":
      return value && typeof value === "object" && (value as Data).src ? value : null;
    case "repeater":
      return Array.isArray(value) ? value.map((row) => normaliseFields(field.fields, (row ?? {}) as Data)) : [];
    case "group":
      return value && typeof value === "object" ? normaliseFields(field.fields, value as Data) : value ?? null;
    case "seo": {
      const s = (value ?? {}) as Data;
      const t = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
      return { title: t(s.title), description: t(s.description), ogImage: t(s.ogImage), noindex: Boolean(s.noindex) };
    }
    default:
      return value;
  }
}

function normaliseFields(fields: Field[], data: Data): Data {
  let out = { ...data };
  for (const f of fields) {
    const v = getPath(out, f.name);
    if (f.type === "group" && (v === null || v === undefined)) continue;
    out = setPath(out, f.name, normaliseValue(f, v));
  }
  return out;
}

/** Turns what the editor sent into exactly the shape the website reads. */
export function normalise(def: CollectionDef, input: Data): Data {
  let d = normaliseFields(def.sections.flatMap((s) => s.fields), input);
  const now = new Date().toISOString();
  const slugField = def.slugField ?? "slug";
  const titleField = def.titleField ?? "title";
  if (!d[slugField] && d[titleField]) d[slugField] = slugify(String(d[titleField]));
  if (slugField === "slug") d.slug = slugify(String(d.slug ?? ""));

  switch (def.key) {
    case "posts": {
      const { html, toc } = cleanHtml(String(d.html ?? ""));
      d = { ...d, html, toc, readingMinutes: readingMinutes(html), modified: now };
      if (!d.excerpt) d.excerpt = plain(html).slice(0, 220);
      break;
    }
    case "pages": {
      const { html, toc } = cleanHtml(String(d.html ?? ""));
      d = { ...d, html, toc, modified: now };
      break;
    }
    case "trips": {
      const overview = cleanHtml(String(d.overview ?? ""));
      d.overview = overview.html;
      d.toc = overview.toc;
      d.modified = now;
      const price = d.price as Data | null;
      if (price && (price.amount === null || price.amount === undefined) && !(price.groupTiers as unknown[])?.length) d.price = null;
      else if (price) d.price = { currency: "USD", per: "person", minPax: 1, regular: null, groupTiers: [], ...price };
      d.sections = ((d.sections as Data[]) ?? []).map((s) => ({ ...s, id: s.id || slugify(String(s.title ?? "")) }));
      d.itinerary = ((d.itinerary as Data[]) ?? []).map((day, i) => ({ ...day, day: day.day ?? i + 1, meals: day.meals ?? [] }));
      d.groupSize = { min: 1, max: null, ...((d.groupSize as Data) ?? {}) };
      break;
    }
  }
  return d;
}

/* ------------------------------------------------------------- checks */

async function checkSlug(def: CollectionDef, slug: string, selfId: string | null) {
  if (!slug) throw new InputError("Please give it a web address.");
  if ((def.slugField ?? "slug") === "slug" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new InputError("Web addresses use lowercase letters, numbers and hyphens only.");
  // Blog posts and pages share the same addresses (basecampadventure.com/<slug>/).
  const shared = def.key === "posts" || def.key === "pages" ? ["posts", "pages"] : [def.key];
  const clash = await db.entry.findFirst({ where: { collection: { in: shared }, slug, NOT: selfId ? { id: selfId } : undefined }, select: { collection: true, title: true } });
  if (clash) throw new InputError(`"${clash.title}" already uses this web address. Choose another.`);
}

/* ------------------------------------------------------------ actions */

export type SaveResult = { id: string; slug: string; status: string; url: string | null };

export async function saveEntry(userId: string, key: string, id: string | null, input: Data, publish: boolean): Promise<SaveResult> {
  const def = collection(key);
  if (!def) throw new InputError("Unknown content type.");
  const data = normalise(def, input);
  const slug = String(data[def.slugField ?? "slug"] ?? "");
  const title = String(data[def.titleField ?? "title"] ?? "").trim();
  if (!title) throw new InputError(`Please give the ${def.singular} a ${def.titleField === "name" ? "name" : "title"}.`);
  await checkSlug(def, slug, id);

  const before = id ? await db.entry.findUnique({ where: { id } }) : null;
  if (id && !before) throw new InputError("This item was deleted by someone else.");

  if (publish && def.key === "posts" && !data.published) data.published = new Date().toISOString();
  const json = data as Prisma.InputJsonValue;

  const entry = before
    ? await db.entry.update({
        where: { id: before.id },
        data: publish
          ? { title, slug, data: json, live: json, status: "published", dirty: false, publishedAt: new Date() }
          : { title, slug, data: json, dirty: before.status === "published" },
      })
    : await db.entry.create({
        data: {
          collection: key,
          title,
          slug,
          data: json,
          live: publish ? json : undefined,
          status: publish ? "published" : "draft",
          publishedAt: publish ? new Date() : null,
          sort: ((await db.entry.aggregate({ where: { collection: key }, _max: { sort: true } }))._max.sort ?? 0) + 1,
        },
      });

  await db.revision.create({ data: { entryId: entry.id, data: json, userId, note: publish ? "Published" : "Saved draft" } });
  // Keep the last 50 versions of each item.
  const old = await db.revision.findMany({ where: { entryId: entry.id }, orderBy: { createdAt: "desc" }, skip: 50, select: { id: true } });
  if (old.length) await db.revision.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });

  if (publish) {
    if (before && before.slug !== slug && before.status === "published" && def.url) await addRedirect(def.url.replace("{slug}", before.slug), def.url.replace("{slug}", slug), `${def.singular} renamed`);
    await writeCollection(def);
    refreshSite();
  }
  await audit(userId, publish ? "content.publish" : "content.save", key, entry.id, title);
  return { id: entry.id, slug, status: entry.status, url: def.url ? def.url.replace("{slug}", slug) : null };
}

export async function addRedirect(from: string, to: string, note?: string) {
  if (from === to) return;
  // Anything that pointed at the old address now points straight to the new one (no chains).
  await db.redirect.updateMany({ where: { to: from }, data: { to } });
  await db.redirect.deleteMany({ where: { from: to } });
  await db.redirect.upsert({ where: { from }, create: { from, to, note }, update: { to, note } });
  await writeRedirects();
}

export async function setStatus(userId: string, key: string, id: string, status: "draft" | "archived") {
  const def = collection(key);
  if (!def) throw new InputError("Unknown content type.");
  const e = await db.entry.update({ where: { id }, data: { status } });
  await writeCollection(def);
  refreshSite();
  await audit(userId, status === "draft" ? "content.unpublish" : "content.archive", key, id, e.title);
}

export async function removeEntry(userId: string, key: string, id: string) {
  const def = collection(key);
  if (!def) throw new InputError("Unknown content type.");
  const e = await db.entry.delete({ where: { id } });
  if (e.status === "published") {
    await writeCollection(def);
    refreshSite();
  }
  await audit(userId, "content.delete", key, id, e.title);
}

export async function reorder(userId: string, key: string, ids: string[]) {
  const def = collection(key);
  if (!def) throw new InputError("Unknown content type.");
  await db.$transaction(ids.map((id, i) => db.entry.update({ where: { id }, data: { sort: i } })));
  await writeCollection(def);
  refreshSite();
  await audit(userId, "content.reorder", key, null);
}
