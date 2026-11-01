/**
 * One-time import: everything the website shows today goes into the admin
 * database, exactly as it is (same slugs, same URLs, same images).
 *
 *   npm run admin:import            add what isn't in the database yet
 *   npm run admin:import -- --force replace database content with the files
 *
 * Also registers every existing image in the media library and creates the
 * first owner account (SEED_OWNER_EMAIL / SEED_OWNER_NAME / SEED_OWNER_PASSWORD).
 * Run `npm run import:wp` first to refresh the files from the old site.
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/admin/db";
import { COLLECTIONS, SINGLETON_WRAP, SINGLETONS, TAXONOMY_KEYS } from "@/lib/admin/collections";
import { hashPassword } from "@/lib/admin/password";
import { ensureIndexNowKey } from "@/lib/admin/indexnow";
import { publishEverything } from "@/lib/admin/publish";

const FORCE = process.argv.includes("--force");
const root = process.cwd();
const read = <T,>(name: string, fallback: T): T => {
  try {
    return JSON.parse(readFileSync(path.join(root, "src", "content", `${name}.json`), "utf8")) as T;
  } catch {
    return fallback;
  }
};

type Item = Record<string, unknown>;

async function upsertEntry(collection: string, slug: string, title: string, data: Item, sort: number) {
  const existing = await db.entry.findUnique({ where: { collection_slug: { collection, slug } }, select: { id: true } });
  if (existing && !FORCE) return "kept";
  const json = data as object;
  if (existing) {
    await db.entry.update({ where: { id: existing.id }, data: { title, data: json, live: json, status: "published", dirty: false, sort } });
    return "updated";
  }
  await db.entry.create({ data: { collection, slug, title, data: json, live: json, status: "published", publishedAt: new Date(), sort } });
  return "added";
}

async function importContent() {
  const taxonomies = read<Record<string, Item[]>>("taxonomies", {});
  const extras = read<Record<string, Record<string, Item>>>("itinerary-extras", {});
  const equipment = read<Record<string, { items: Item[] }>>("equipment", {});
  const travellerPhotos = read<Record<string, (Item & { traveller?: string; date?: string | null })[]>>("traveller-photos", {});
  const translations = read<Record<string, Item>>("trip-translations", {});

  for (const def of COLLECTIONS) {
    let items: Item[] = def.file === "taxonomies" ? taxonomies[def.key] ?? [] : read<Item[]>(def.file, []);
    if (def.key === "trips") {
      items = items.map((t) => ({
        ...t,
        itinerary: (t.itinerary as Item[]).map((d) => ({ ...d, ...(extras[String(t.slug)]?.[String(d.day)] ?? {}) })),
        equipment: equipment[String(t.slug)]?.items ?? [],
        travellerPhotos: (travellerPhotos[String(t.slug)] ?? []).map(({ traveller, date, ...photo }) => ({ photo, traveller: traveller ?? "", date: date ?? null })),
        ...(translations[String(t.slug)] ? { translations: translations[String(t.slug)] } : {}),
      }));
    }
    const slugField = def.slugField ?? "slug";
    const titleField = def.titleField ?? "title";
    const tally: Record<string, number> = {};
    for (const [i, item] of items.entries()) {
      const slug = String(item[slugField] ?? item.title ?? i);
      if (!item[slugField]) item[slugField] = slug;
      const r = await upsertEntry(def.key, slug, String(item[titleField] ?? slug), item, i);
      tally[r] = (tally[r] ?? 0) + 1;
    }
    console.log(`${def.label.padEnd(20)} ${items.length.toString().padStart(4)}  ${JSON.stringify(tally)}`);
  }
  void TAXONOMY_KEYS;

  for (const s of SINGLETONS) {
    const raw = read<unknown>(s.file, null);
    if (raw === null) continue;
    const wrap = SINGLETON_WRAP[s.key];
    const value = (wrap ? { [wrap]: raw } : raw) as object;
    const key = `doc:${s.key}`;
    const existing = await db.setting.findUnique({ where: { key } });
    if (existing && !FORCE) continue;
    await db.setting.upsert({ where: { key }, create: { key, value, public: false }, update: { value } });
  }
  console.log(`Single pages         ${SINGLETONS.length}`);
}

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(webp|jpe?g|png|avif|gif|svg)$/i.test(name)) yield p;
  }
}

async function importMedia() {
  let added = 0;
  let seen = 0;
  for (const base of ["media", "photos", "equipment"]) {
    const dir = path.join(root, "public", base);
    try {
      statSync(dir);
    } catch {
      continue;
    }
    for (const file of files(dir)) {
      seen++;
      const src = `/${path.relative(path.join(root, "public"), file).split(path.sep).join("/")}`;
      if (await db.media.findUnique({ where: { src }, select: { id: true } })) continue;
      const buf = readFileSync(file);
      const hash = createHash("sha256").update(buf).digest("hex");
      if (await db.media.findUnique({ where: { hash }, select: { id: true } })) continue;
      const meta = await sharp(buf).metadata().catch(() => ({ width: 0, height: 0, format: "svg" }) as sharp.Metadata);
      const ext = path.extname(file).slice(1).toLowerCase();
      await db.media.create({
        data: {
          src,
          hash,
          originalName: path.basename(file),
          mime: ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`,
          width: meta.width ?? 0,
          height: meta.height ?? 0,
          bytes: buf.length,
          alt: path.basename(file, path.extname(file)).replace(/[-_]+/g, " ").replace(/\b(\d+|enhanced|hd|original|cutout)\b/g, "").trim(),
          folder: base === "media" ? src.split("/")[2] ?? "media" : base,
        },
      });
      added++;
    }
  }
  console.log(`Images               ${seen}  ${added} added to the media library`);
}

async function owner() {
  if (await db.user.count()) return;
  const email = (process.env.SEED_OWNER_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    console.log("\nNo users yet. Create the first account with:\n  SEED_OWNER_EMAIL=you@example.com SEED_OWNER_NAME='Your Name' npm run admin:import");
    return;
  }
  const generated = !process.env.SEED_OWNER_PASSWORD;
  const password = process.env.SEED_OWNER_PASSWORD ?? randomBytes(12).toString("base64url");
  await db.user.create({ data: { email, name: process.env.SEED_OWNER_NAME ?? "Owner", role: "owner", passwordHash: await hashPassword(password) } });
  console.log(`\nOwner account created: ${email}${generated ? `\nTemporary password (shown once): ${password}\nSign in, then change it under Account.` : ""}`);
}

async function main() {
  console.log(FORCE ? "Importing (replacing database content)…\n" : "Importing…\n");
  await importContent();
  await importMedia();
  await owner();
  await ensureIndexNowKey();
  await publishEverything();
  console.log("\nDone. The website now reads the published content from the admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
